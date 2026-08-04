import "server-only";
import PQueue from "p-queue";
import { analyzeJobFit } from "@/server/ai/analyzer";
import { getFullResume } from "@/server/resume/curriculoService";
import { applicationRepo, jobRepo } from "@/server/db/repositories";
import type { Job } from "@/server/db/schema";
import type { Curriculo } from "@/server/ai/types";

/**
 * Pontuação de vagas em lote.
 *
 * Free tier do Gemini: ~10-15 RPM. 10/min é conservador. A fila p-queue respeita
 * o RPM para não estourar a cota.
 */
const RPM = 10;

export interface ScoreResult {
  jobId: number;
  titulo: string;
  score: number;
}

/** Pontua uma vaga: analisa, persiste na application e grava o NOC. */
export async function scoreOne(
  job: Job,
  curriculo: Curriculo,
): Promise<ScoreResult> {
  const analise = await analyzeJobFit(curriculo, {
    titulo: job.titulo,
    descricao: job.descricao,
    empresa: job.empresa ?? undefined,
  });

  const application = await applicationRepo.getByJob(job.id);
  if (application) {
    await applicationRepo.setAnalysis(application.id, analise.score, {
      work_auth_verdict: analise.canadian?.work_auth_verdict,
      language_verdict: analise.canadian?.language_verdict,
      regulated_gap: analise.canadian?.regulated_gap,
      noc_suggestion: analise.noc_suggestion,
    });
  }
  if (analise.noc_suggestion?.code && !job.nocCode) {
    await jobRepo.setNoc(
      job.id,
      analise.noc_suggestion.code,
      analise.noc_suggestion.confidence,
    );
  }
  return { jobId: job.id, titulo: job.titulo, score: analise.score };
}

/** Pontua um conjunto de vagas respeitando o RPM. */
export async function scoreJobs(jobsToScore: Job[]): Promise<ScoreResult[]> {
  if (jobsToScore.length === 0) return [];
  const curriculo = await getFullResume();
  const queue = new PQueue({
    concurrency: 1,
    interval: 60_000,
    intervalCap: RPM,
    carryoverConcurrencyCount: true,
  });
  return Promise.all(
    jobsToScore.map((job) => queue.add(() => scoreOne(job, curriculo))),
  ) as Promise<ScoreResult[]>;
}
