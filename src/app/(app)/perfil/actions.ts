"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { perfilRepo } from "@/server/db/repositories";

export type ActionState = { error?: string; success?: boolean };

/** Salva (upsert) o perfil. Registro único. Assinatura para useActionState. */
export async function savePerfil(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };

  const nomeCompleto = get("nomeCompleto");
  if (!nomeCompleto) {
    return { error: "Nome completo é obrigatório." };
  }

  await perfilRepo.upsert({
    nomeCompleto,
    email: get("email"),
    telefone: get("telefone"),
    localizacao: get("localizacao"),
    linkedin: get("linkedin"),
    github: get("github"),
    resumoBase: get("resumoBase"),
    dataNascimento: get("dataNascimento"),
  });

  revalidatePath("/perfil");
  revalidatePath("/");
  return { success: true };
}
