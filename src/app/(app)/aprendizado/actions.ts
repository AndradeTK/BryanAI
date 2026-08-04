"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { answerRepo } from "@/server/db/repositories";
import { normalizeQuestion } from "@/server/apply/answers";

export type ActionState = { error?: string; success?: boolean };

export async function saveAnswer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const questionLabel = get("questionLabel");
  const answer = get("answer");
  if (!questionLabel) return { error: "A pergunta é obrigatória." };
  if (!answer) return { error: "A resposta é obrigatória." };

  const idRaw = get("id");
  const id = idRaw ? Number(idRaw) : null;

  if (id) {
    // Edição: mantém a key (não re-normaliza para não perder o casamento).
    await answerRepo.update(id, { questionLabel, answer });
  } else {
    await answerRepo.upsert(normalizeQuestion(questionLabel), questionLabel, answer);
  }

  revalidatePath("/aprendizado");
  return { success: true };
}

export async function deleteAnswer(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await answerRepo.remove(id);
  revalidatePath("/aprendizado");
}
