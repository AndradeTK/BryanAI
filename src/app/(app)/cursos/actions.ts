"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { cursoRepo } from "@/server/db/repositories";

export type ActionState = { error?: string; success?: boolean };

export async function saveCurso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const tituloDoCurso = get("tituloDoCurso");
  if (!tituloDoCurso) return { error: "Título do curso é obrigatório." };

  const idRaw = get("id");
  const id = idRaw ? Number(idRaw) : null;
  const data = {
    tituloDoCurso,
    emissorInstituicao: get("emissorInstituicao"),
    descricao: get("descricao"),
    destaque: formData.get("destaque") === "on",
    link: get("link"),
  };

  if (id) await cursoRepo.update(id, data);
  else await cursoRepo.create(data);

  revalidatePath("/cursos");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCurso(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await cursoRepo.remove(id);
  revalidatePath("/cursos");
  revalidatePath("/");
}
