"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { idiomaRepo } from "@/server/db/repositories";

export type ActionState = { error?: string; success?: boolean };

export async function saveIdioma(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const idioma = get("idioma");
  if (!idioma) return { error: "Idioma é obrigatório." };

  const idRaw = get("id");
  const id = idRaw ? Number(idRaw) : null;
  const data = {
    idioma,
    nivelCefr: get("nivelCefr"),
    certificacaoExame: get("certificacaoExame"),
    historicoDeEscolas: get("historicoDeEscolas"),
    link: get("link"),
  };

  if (id) await idiomaRepo.update(id, data);
  else await idiomaRepo.create(data);

  revalidatePath("/idiomas");
  revalidatePath("/");
  return { success: true };
}

export async function deleteIdioma(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await idiomaRepo.remove(id);
  revalidatePath("/idiomas");
  revalidatePath("/");
}
