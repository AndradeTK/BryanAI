import { z } from "zod";
import { ok, fail, handle, guardPanel } from "@/server/http/api";
import { generateText, MODELS } from "@/server/ai/client";
import { contextoDeData } from "@/server/ai/prompts";

/**
 * Melhora a redação de um campo de texto do currículo.
 *
 * O limite é rígido e é o que torna esta função aceitável num currículo: ela
 * REESCREVE o que está escrito, nunca acrescenta fato. Um botão de "melhorar"
 * que inventa uma métrica produz uma afirmação que o candidato terá que
 * defender numa entrevista — o mesmo risco que o projeto já trata na geração e
 * na transcrição por OCR.
 */
const BodySchema = z.object({
  campo: z.enum([
    "atividades",
    "conquistas",
    "resumo",
    "descricao",
  ]),
  texto: z.string().min(10).max(6000),
  /** Cargo/empresa ou título — ajuda o modelo a escolher o vocabulário certo. */
  contexto: z.string().max(300).optional(),
  idioma: z.enum(["pt-BR", "en-CA"]).default("pt-BR"),
});

const INSTRUCAO: Record<z.infer<typeof BodySchema>["campo"], string> = {
  atividades:
    "É a descrição de atividades de uma experiência profissional. Organize em bullets começando por verbo de ação no passado (ou presente, se for o emprego atual). Cada bullet uma responsabilidade concreta.",
  conquistas:
    "São as principais conquistas de uma experiência. Deixe cada uma como um resultado, não uma tarefa. Se o texto já traz um número, mantenha-o EXATAMENTE como está.",
  resumo:
    "É o resumo profissional do topo do currículo. Deixe em 3 a 5 linhas de texto corrido, sem bullets, na terceira pessoa implícita (sem 'eu').",
  descricao:
    "É a descrição de um curso, projeto ou certificação. Deixe objetiva, dizendo o que foi feito ou aprendido.",
};

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { campo, texto, contexto, idioma } = BodySchema.parse(await request.json());

    const prompt = `${contextoDeData()}

Você reescreve trechos de currículo para ficarem mais claros e mais fortes para
sistemas ATS e recrutadores. ${INSTRUCAO[campo]}

REGRAS ABSOLUTAS — o texto vai para um currículo real:
- NÃO invente NADA. Nenhuma métrica, número, porcentagem, tecnologia, cliente,
  prêmio, período ou responsabilidade que não esteja no texto original.
- Se o original não tem números, o resultado também não terá. Não estime, não
  arredonde, não sugira faixas.
- Não troque uma tecnologia por outra "parecida", nem generalize um nome
  específico.
- Pode: melhorar verbos, cortar redundância, organizar, corrigir gramática,
  deixar mais direto e mais concreto.
- ${idioma === "en-CA" ? "Escreva em inglês canadense." : "Escreva em português do Brasil."}
- Devolva SOMENTE o texto reescrito, sem comentários, sem aspas em volta, sem
  explicar o que mudou.

${contexto ? `CONTEXTO (não é conteúdo a incluir, só referência): ${contexto}\n` : ""}
TEXTO ORIGINAL:
---
${texto}
---`;

    const melhorado = (
      await generateText({
        model: MODELS.fast,
        prompt,
        temperature: 0.4,
        maxOutputTokens: 2048,
      })
    ).trim();

    if (!melhorado) return fail("A IA não devolveu texto. Tente de novo.");

    return ok({ texto: melhorado, original: texto });
  });
}
