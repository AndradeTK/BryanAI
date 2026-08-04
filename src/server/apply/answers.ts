import "server-only";
import { z } from "zod";
import { generateStructured, MODELS } from "@/server/ai/client";
import { getFullResume } from "@/server/resume/curriculoService";
import { answerRepo } from "@/server/db/repositories";
import type { Curriculo } from "@/server/ai/types";

/**
 * Base de aprendizado do Copiloto (Fase 10).
 *
 * Casa os campos de um formulário Easy Apply com (1) uma resposta já aprendida,
 * (2) um dado do perfil (via IA), ou marca 'needs_input' quando não há como
 * responder. O usuário preenche os 'needs_input' uma vez → viram respostas
 * salvas → nas próximas vagas já preenchem. NUNCA envia nada; só prepara.
 */

/**
 * Normaliza o texto de uma pergunta num slug estável (question_key), para que
 * "Anos de experiência com Python?" e "  anos de experiencia com Python "
 * casem no mesmo registro.
 */
export function normalizeQuestion(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // não-alfanumérico → hífen
    .replace(/^-+|-+$/g, "") // apara hífens das pontas
    .slice(0, 200);
}

export type RespostaSource = "saved" | "profile" | "needs_input";

export interface RespostaCampo {
  label: string;
  key: string;
  value: string;
  source: RespostaSource;
}

/** Um único item da resposta da IA para campos não cobertos por respostas salvas. */
const CampoIaSchema = z.object({
  key: z.string(),
  value: z.string(),
  found: z.boolean(),
});
const CamposIaSchema = z.object({ campos: z.array(CampoIaSchema) });

/**
 * Casa cada campo do formulário com uma resposta. Ordem de prioridade:
 * 1. Resposta salva (question_key) → source 'saved'.
 * 2. Dado do perfil, resolvido pela IA numa única chamada → 'profile'.
 * 3. Sem dado → 'needs_input' (usuário preenche e o app aprende).
 */
export async function matchFields(
  labels: string[],
  curriculo?: Curriculo,
): Promise<RespostaCampo[]> {
  const resultados: RespostaCampo[] = [];
  const pendentes: { label: string; key: string }[] = [];

  for (const label of labels) {
    const key = normalizeQuestion(label);
    if (!key) continue;
    const saved = await answerRepo.findByKey(key);
    if (saved) {
      resultados.push({ label, key, value: saved.answer, source: "saved" });
    } else {
      pendentes.push({ label, key });
    }
  }

  if (pendentes.length === 0) return resultados;

  const cur = curriculo ?? (await getFullResume());
  let respostasIa: z.infer<typeof CamposIaSchema>["campos"];
  try {
    const out = await generateStructured({
      model: MODELS.fast,
      schema: CamposIaSchema,
      temperature: 0.2,
      prompt: `Você preenche formulários de candidatura a partir dos dados do candidato.
Para cada campo abaixo, responda SOMENTE com base nos dados do candidato.
Se o dado não existir no perfil, marque found=false e deixe value vazio — NÃO invente.

DADOS DO CANDIDATO:
${JSON.stringify(cur, null, 1)}

CAMPOS DO FORMULÁRIO (key + rótulo original):
${pendentes.map((p) => `- ${p.key}: "${p.label}"`).join("\n")}

Retorne { "campos": [ { "key", "value", "found" } ] } com um item por campo.`,
    });
    respostasIa = out.campos;
  } catch {
    // IA indisponível — todos os pendentes viram needs_input.
    respostasIa = [];
  }

  for (const p of pendentes) {
    const hit = respostasIa.find((r) => r.key === p.key);
    if (hit?.found && hit.value.trim()) {
      resultados.push({
        label: p.label,
        key: p.key,
        value: hit.value.trim(),
        source: "profile",
      });
    } else {
      resultados.push({ label: p.label, key: p.key, value: "", source: "needs_input" });
    }
  }

  // Mantém a ordem original dos labels.
  return labels
    .map((l) => resultados.find((r) => r.label === l))
    .filter((r): r is RespostaCampo => r != null);
}
