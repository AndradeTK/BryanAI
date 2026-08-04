import "server-only";
import { createHash } from "node:crypto";
import { TaskType } from "@google/generative-ai";
import { embedText, resumeToEmbeddingText } from "@/server/ai/embeddings";
import { getFullResume } from "@/server/resume/curriculoService";
import { profileEmbeddingRepo, jobRepo } from "@/server/db/repositories";
import type { Job } from "@/server/db/schema";

/**
 * Matching semântico perfil × vagas (Fase 4).
 *
 * O embedding do perfil é caro de recomputar, então é cacheado em
 * profile_embedding e só refeito quando o texto do currículo muda (source_hash).
 */

/** Garante o embedding do perfil no banco; recomputa se o currículo mudou. */
export async function ensureProfileEmbedding(): Promise<number[]> {
  const curriculo = await getFullResume();
  const text = resumeToEmbeddingText(curriculo);
  const hash = createHash("sha256").update(text).digest("hex");

  const existing = await profileEmbeddingRepo.get();
  if (existing && existing.sourceHash === hash) {
    return parseVector(existing.embedding);
  }

  const embedding = await embedText(text, TaskType.RETRIEVAL_QUERY);
  await profileEmbeddingRepo.upsert(embedding, hash);
  return embedding;
}

/** Vagas ordenadas por similaridade com o perfil (mais parecida primeiro). */
export async function rankJobsByProfile(
  limit = 10,
): Promise<Array<Job & { distance: number }>> {
  const profileVec = await ensureProfileEmbedding();
  return jobRepo.nearestToProfile(profileVec, limit);
}

/**
 * O postgres.js devolve `vector` como string '[1,2,3]' ou como number[]
 * dependendo do driver — normalizamos para number[].
 */
function parseVector(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    return v
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map(Number);
  }
  throw new Error("Formato de embedding inesperado ao ler profile_embedding.");
}
