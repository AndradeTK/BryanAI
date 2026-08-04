import "server-only";
import { TaskType } from "@google/generative-ai";
import { embedText, jobToEmbeddingText } from "@/server/ai/embeddings";
import { jobRepo, nocRepo } from "@/server/db/repositories";
import type { Job, NewJob } from "@/server/db/schema";
import { computeDedupHash, type ParsedJob } from "./ingest-parse";

// Reexporta as funções puras para os consumidores server-side.
export {
  parseJsonLd,
  parseManual,
  computeDedupHash,
  stripHtml,
  type ParsedJob,
} from "./ingest-parse";

/**
 * Pipeline completo: dedup → embedding → NOC → upsert. Retorna o job salvo.
 * Toda vaga capturada entra direto no kanban — a captura em lote com fila de
 * triagem foi removida por não ser confiável na extração das listagens.
 */
export async function ingestJob(parsed: ParsedJob): Promise<Job> {
  const dedupHash = computeDedupHash(parsed);
  const embedding = await embedText(
    jobToEmbeddingText({
      titulo: parsed.titulo,
      descricao: parsed.descricao,
      empresa: parsed.empresa ?? undefined,
    }),
    TaskType.RETRIEVAL_DOCUMENT,
  );

  // Sugestão de NOC por similaridade semântica (se o catálogo foi seedado).
  // distance de cosseno → confiança aproximada (1 - dist).
  let nocCode: string | null = null;
  let nocConfidence: number | null = null;
  try {
    if ((await nocRepo.count()) > 0) {
      const [best] = await nocRepo.nearest(embedding, 1);
      if (best) {
        nocCode = best.code;
        nocConfidence = Math.max(0, Math.min(1, 1 - best.distance));
      }
    }
  } catch {
    // catálogo ausente/erro — segue sem NOC (preenchível depois)
  }

  const data: NewJob & { embedding: number[] } = {
    titulo: parsed.titulo,
    empresa: parsed.empresa,
    descricao: parsed.descricao,
    localizacao: parsed.localizacao,
    url: parsed.url,
    source: parsed.source,
    salaryRaw: parsed.salaryRaw,
    datePosted: parsed.datePosted,
    nocCode,
    nocConfidence,
    dedupHash,
    embedding,
  };
  return jobRepo.upsertByHash(data);
}
