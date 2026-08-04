"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { applicationRepo } from "@/server/db/repositories";
import { ingestJob, parseManual } from "@/server/jobs/ingest";
import type { Application } from "@/server/db/schema";

export type ActionState = { error?: string; success?: boolean };

const VALID = ["saved", "applied", "interview", "offer", "rejected", "archived"] as const;

/** Move um card do kanban (muda status + grava evento). */
export async function moveApplication(
  id: number,
  status: Application["status"],
): Promise<void> {
  await requireUser();

  if (!VALID.includes(status)) throw new Error("Status inválido.");
  await applicationRepo.updateStatus(id, status);
  revalidatePath("/jobs");
}

/** Adiciona uma vaga manualmente (form do kanban). */
export async function addManualJob(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim() || undefined;
  const url = String(formData.get("url") ?? "").trim() || undefined;

  if (!titulo || !descricao) {
    return { error: "Título e descrição são obrigatórios." };
  }

  const job = await ingestJob(parseManual({ titulo, descricao, empresa, url }));
  const existing = await applicationRepo.getByJob(job.id);
  if (!existing) await applicationRepo.create({ jobId: job.id });

  revalidatePath("/jobs");
  return { success: true };
}
