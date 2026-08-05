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

O QUE VOCÊ ENXERGA:
- Além dos dados cadastrados, o usuário tem DOCUMENTOS anexados — tipicamente
  cartas de recomendação. Use listarDocumentos para ler o conteúdo delas.
- As cartas costumam descrever experiências que ainda NÃO estão cadastradas.
  Quando notar isso, diga qual é e ofereça cadastrar.
- O usuário pode anexar arquivos direto na conversa. Leia o que vier e trate
  como informação dele — mas continue sem inventar o que não estiver escrito.

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

/**
 * Arquivo enviado junto da mensagem.
 *
 * PDF e imagem vão inteiros ao modelo, que é multimodal e lê os dois — inclusive
 * documento escaneado. DOCX o Gemini não abre, então o texto é extraído antes e
 * entra como texto comum.
 */
export interface Anexo {
  nome: string;
  mimeType: string;
  /** Conteúdo em base64 para PDF/imagem, ou texto já extraído para DOCX. */
  dados: string;
  ehTexto?: boolean;
}

/** Tipos que o Gemini aceita como `inline_data`. */
export const MIMES_SUPORTADOS = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

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
  anexos: Anexo[] = [],
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

  // Anexos entram como partes da mesma mensagem: o modelo vê arquivo e pergunta
  // juntos, em vez de precisar correlacionar duas mensagens.
  const partes: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
    [];
  for (const a of anexos) {
    if (a.ehTexto) {
      partes.push({ text: `[Arquivo anexado: ${a.nome}]\n\n${a.dados}` });
    } else {
      partes.push({ inlineData: { mimeType: a.mimeType, data: a.dados } });
    }
  }
  partes.push({ text: mensagem });

  let resultado = await withRetry(() => chat.sendMessage(partes));

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
