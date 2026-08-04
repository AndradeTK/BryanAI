"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { formacaoRepo } from "@/server/db/repositories";

export type ActionState = { error?: string; success?: boolean };

export async function saveFormacao(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const tipo = get("tipo");
  if (tipo !== "educacao" && tipo !== "projeto")
    return { error: "Tipo inválido." };
  const instituicaoProjeto = get("instituicaoProjeto");
  if (!instituicaoProjeto)
    return { error: "Instituição/Projeto é obrigatório." };

  const idRaw = get("id");
  const id = idRaw ? Number(idRaw) : null;
  const data = {
    tipo: tipo as "educacao" | "projeto",
    instituicaoProjeto,
    tituloCurso: get("tituloCurso"),
    status: get("status"),
    descricaoDetalhada: get("descricaoDetalhada"),
    link: get("link"),
  };

  if (id) await formacaoRepo.update(id, data);
  else await formacaoRepo.create(data);

  revalidatePath("/formacao");
  revalidatePath("/");
  return { success: true };
}

export async function deleteFormacao(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await formacaoRepo.remove(id);
  revalidatePath("/formacao");
  revalidatePath("/");
}

/** Persiste a nova ordem (lista de ids na sequência desejada). */
export async function reorderFormacoes(ids: number[]): Promise<void> {
  await requireUser();

  await Promise.all(
    ids.map((id, i) => formacaoRepo.update(id, { sortOrder: i })),
  );
  revalidatePath("/formacao");
  revalidatePath("/");
}
