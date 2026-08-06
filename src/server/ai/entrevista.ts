import "server-only";
import { z } from "zod";
import { generateStructured, MODELS } from "./client";
import { contextoDeData } from "./prompts";
import { getFullResume } from "@/server/resume/curriculoService";
import type { Vaga } from "./types";

/**
 * Preparação para entrevista, fundamentada no perfil real.
 *
 * O valor não está em listar perguntas genéricas de entrevista — isso está em
 * qualquer blog. Está em cruzar a vaga com o que o candidato REALMENTE tem:
 * quais perguntas essa vaga provavelmente fará, com qual experiência dele
 * responder cada uma, e onde ele vai apanhar.
 *
 * As respostas sugeridas citam experiências existentes. O modelo não pode
 * inventar um projeto para responder bem — se não há material, a orientação é
 * dizer isso, não fabricar.
 */

const PerguntaSchema = z.object({
  pergunta: z.string(),
  categoria: z.enum([
    "tecnica",
    "comportamental",
    "sobre_a_vaga",
    "autorizacao_e_mudanca",
  ]),
  porque_perguntam: z.string(),
  /** Qual experiência/projeto/carta do candidato sustenta a resposta. */
  ancora: z.string().nullable(),
  roteiro: z.string(),
  /** true quando o perfil não tem material para uma boa resposta. */
  ponto_fraco: z.boolean(),
});

export const PreparoEntrevistaSchema = z.object({
  resumo_da_conversa: z
    .string()
    .describe("2-3 frases sobre o que esperar desta entrevista especificamente"),
  perguntas: z.array(PerguntaSchema).min(6).max(12),
  perguntas_para_fazer: z
    .array(z.string())
    .describe("Perguntas que o candidato deve fazer ao entrevistador"),
  pontos_a_evitar: z.array(z.string()),
  preparo_pratico: z
    .array(z.string())
    .describe("O que revisar ou praticar antes, em ordem de prioridade"),
});

export type PreparoEntrevista = z.infer<typeof PreparoEntrevistaSchema>;

export async function prepararEntrevista(
  vaga: Vaga,
  idioma: "pt-BR" | "en-CA" = "pt-BR",
): Promise<PreparoEntrevista> {
  const cv = await getFullResume();

  const canada = cv.canada
    ? `
CONTEXTO CANADENSE:
- Autorização: ${cv.canada.work_authorization}
- Inglês CLB ${cv.canada.clb_english ?? "não avaliado"} | Francês NCLC ${cv.canada.nclc_french ?? "não avaliado"}
- ECA: ${cv.canada.eca_status}
- Experiência no Canadá: ${cv.canada.canadian_exp_months} meses`
    : "";

  const prompt = `${contextoDeData()}

Você é um recrutador técnico sênior no Canadá preparando um candidato para uma
entrevista específica. Não dê conselho genérico de entrevista — cruze ESTA vaga
com ESTE perfil.

REGRAS:
- Cada resposta sugerida deve se apoiar em algo que o candidato REALMENTE tem.
  Preencha \`ancora\` com a experiência, projeto, certificação ou carta que
  sustenta a resposta.
- Se o perfil NÃO tem material para responder bem uma pergunta provável, marque
  \`ponto_fraco: true\`, deixe \`ancora\` null, e no roteiro diga honestamente
  como conduzir — reconhecer a lacuna e redirecionar para o que tem. NUNCA
  fabrique experiência, número ou projeto.
- \`roteiro\` é um esqueleto do que dizer, não um texto decorado. Use STAR
  (situação, tarefa, ação, resultado) nas comportamentais.
- Inclua ao menos uma pergunta sobre autorização de trabalho ou mudança se o
  contexto canadense sugerir que ela virá.
- ${idioma === "en-CA" ? "Escreva em inglês canadense." : "Escreva em português do Brasil."}

PERFIL DO CANDIDATO:
${JSON.stringify(cv, null, 1)}
${canada}

VAGA:
Título: ${vaga.titulo}
${vaga.descricao}`;

  return generateStructured({
    model: MODELS.fast,
    schema: PreparoEntrevistaSchema,
    prompt,
    temperature: 0.4,
    maxOutputTokens: 8192,
  });
}
