import "server-only";
import type { Content } from "@google/generative-ai";
import { genAI, MODELS } from "@/server/ai/client";
import { withRetry } from "@/server/ai/retry";
import { contextoDeData } from "@/server/ai/prompts";
import {
  DECLARACOES,
  LEITURAS,
  ROTULO_ESCRITA,
  ehLeitura,
  ehEscrita,
  type NomeEscrita,
} from "./ferramentas";

/**
 * Assistente conversacional sobre os dados do próprio usuário.
 *
 * O laço é: manda a mensagem → se o modelo pede uma LEITURA, executa e devolve
 * o resultado para ele continuar → se pede uma ESCRITA, o turno PARA e a
 * alteração volta como proposta para o usuário aprovar na tela.
 *
 * Escrita nunca acontece aqui. Quem grava é `aplicarEscrita`, chamado por outra
 * rota, depois do aceite.
 */

const SISTEMA = `Você é o assistente do BryanAI, uma ferramenta pessoal de candidatura a vagas com foco no mercado canadense. Você conversa com o DONO dos dados sobre o próprio currículo e ajuda a mantê-lo em dia.

COMO TRABALHAR:
- Antes de propor qualquer alteração em algo que já existe, LEIA primeiro (listarExperiencias, lerPerfil...) para pegar o id certo e o valor atual. Nunca adivinhe um id.
- Ao criar algo novo, não passe id.
- Proponha UMA alteração por vez. O usuário aprova ou recusa cada uma.
- Depois de propor, não afirme que salvou — quem decide é ele.

SOBRE OS DADOS:
- NÃO invente. Se o usuário disser "trabalhei uns dois anos lá", pergunte as datas em vez de estimar. Datas, números e métricas erradas viram afirmações que ele terá que defender numa entrevista.
- Se algo estiver ambíguo, pergunte. Uma pergunta a mais é melhor que um dado errado no currículo.
- Currículo canadense NÃO leva foto, idade, data de nascimento, estado civil, nacionalidade nem gênero — exigência dos Human Rights Codes provinciais. Nunca sugira incluir.
- workAuthorization muda o veredicto de toda vaga analisada. Só altere com informação explícita.

ESTILO:
- Português do Brasil, direto e sem formalidade excessiva.
- Respostas curtas. Sem repetir o que o usuário acabou de dizer.
- Sem emoji.`;

export interface Mensagem {
  papel: "user" | "model";
  texto: string;
}

export interface PropostaEscrita {
  ferramenta: NomeEscrita;
  rotulo: string;
  argumentos: Record<string, unknown>;
}

export interface RespostaAgente {
  texto: string;
  proposta: PropostaEscrita | null;
}

/** Quantas voltas de leitura o modelo pode dar antes de precisar responder. */
const MAX_VOLTAS = 6;

export async function conversar(
  historico: Mensagem[],
  mensagem: string,
): Promise<RespostaAgente> {
  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    systemInstruction: `${contextoDeData()}\n\n${SISTEMA}`,
    tools: [{ functionDeclarations: DECLARACOES }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
  });

  const history: Content[] = historico.map((m) => ({
    role: m.papel,
    parts: [{ text: m.texto }],
  }));

  const chat = model.startChat({ history });
  let resultado = await withRetry(() => chat.sendMessage(mensagem));

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const chamadas = resultado.response.functionCalls() ?? [];
    if (chamadas.length === 0) break;

    // Escrita interrompe o turno: vira proposta, não execução.
    const escrita = chamadas.find((c) => ehEscrita(c.name));
    if (escrita) {
      return {
        texto:
          resultado.response.text().trim() ||
          "Preparei esta alteração — confira antes de aplicar:",
        proposta: {
          ferramenta: escrita.name as NomeEscrita,
          rotulo: ROTULO_ESCRITA[escrita.name as NomeEscrita],
          argumentos: (escrita.args ?? {}) as Record<string, unknown>,
        },
      };
    }

    // Leituras: executa todas e devolve ao modelo para ele continuar.
    const respostas = await Promise.all(
      chamadas.map(async (c) => {
        if (!ehLeitura(c.name)) {
          return {
            functionResponse: {
              name: c.name,
              response: { erro: `Ferramenta desconhecida: ${c.name}` },
            },
          };
        }
        try {
          const dados = await LEITURAS[c.name]();
          return { functionResponse: { name: c.name, response: { dados } } };
        } catch (e) {
          return {
            functionResponse: {
              name: c.name,
              response: { erro: (e as Error).message },
            },
          };
        }
      }),
    );

    resultado = await withRetry(() => chat.sendMessage(respostas));
  }

  const texto = resultado.response.text().trim();
  return {
    texto:
      texto ||
      "Não consegui formular uma resposta. Pode reformular o que precisa?",
    proposta: null,
  };
}
