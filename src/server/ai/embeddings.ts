import { TaskType } from "@google/generative-ai";
import { genAI, MODELS } from "./client";
import { withRetry } from "./retry";
import type { Curriculo, Vaga } from "./types";

/**
 * Camada de embeddings (Fase 4). Usa gemini-embedding-001 com 3072 dimensões
 * (default do modelo — dispensa a normalização manual que dims menores exigem).
 *
 * taskType RETRIEVAL_DOCUMENT para o que é indexado (vagas, currículo-documento)
 * e RETRIEVAL_QUERY para a "consulta" (o perfil buscando vagas). O par certo
 * melhora a qualidade da similaridade de cosseno no pgvector.
 */

export const EMBEDDING_DIMS = 3072;

/** Gera o embedding de um texto. Retorna number[3072]. */
export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT,
): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: MODELS.embedding });
  const result = await withRetry(() =>
    model.embedContent({
      content: { role: "user", parts: [{ text }] },
      taskType,
    }),
  );
  return result.embedding.values;
}

/** Gera embeddings de vários textos numa única request. */
export async function embedBatch(
  texts: string[],
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = genAI.getGenerativeModel({ model: MODELS.embedding });
  const result = await withRetry(() =>
    model.batchEmbedContents({
      requests: texts.map((text) => ({
        content: { role: "user", parts: [{ text }] },
        taskType,
      })),
    }),
  );
  return result.embeddings.map((e) => e.values);
}

/** Serializa o currículo num texto denso para embutir (o "documento" do candidato). */
export function resumeToEmbeddingText(curriculo: Curriculo): string {
  const p = curriculo.perfil;
  const partes: string[] = [];
  if (p?.resumo_base) partes.push(p.resumo_base);
  if (curriculo.resumo) partes.push(curriculo.resumo);
  for (const exp of curriculo.experiencias ?? []) {
    const cargo = exp.cargo ?? exp.titulo ?? "";
    const empresa = exp.empresa ?? "";
    const desc = exp.descricao_atividades ?? exp.principais_conquistas ?? "";
    partes.push(`${cargo} ${empresa} ${desc}`.trim());
  }
  for (const f of curriculo.formacao ?? []) {
    partes.push(`${f.titulo_curso ?? ""} ${f.instituicao_projeto ?? ""}`.trim());
  }
  return partes.filter(Boolean).join("\n").slice(0, 8000);
}

/** Serializa uma vaga para embutir. */
export function jobToEmbeddingText(vaga: Vaga): string {
  return `${vaga.titulo}\n${vaga.empresa ?? ""}\n${vaga.descricao}`.slice(0, 8000);
}
