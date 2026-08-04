"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { experienciaRepo } from "@/server/db/repositories";

export type ActionState = { error?: string; success?: boolean };

function parseTags(v: string | null): string[] | null {
  if (!v) return null;
  const arr = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : null;
}

export async function saveExperiencia(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const idRaw = get("id");
  const id = idRaw ? Number(idRaw) : null;

  const empresa = get("empresa");
  const cargo = get("cargo");
  if (!empresa || !cargo) return { error: "Empresa e cargo são obrigatórios." };

  const data = {
    empresa,
    cargo,
    dataInicio: get("dataInicio"),
    dataFim: get("dataFim"), // vazio = emprego atual
    descricaoAtividades: get("descricaoAtividades"),
    principaisConquistas: get("principaisConquistas"),
    categoria: get("categoria"),
    tagsTecnicas: parseTags(get("tagsTecnicas")),
  };

  if (id) await experienciaRepo.update(id, data);
  else await experienciaRepo.create(data);

  revalidatePath("/experiencias");
  revalidatePath("/");
  return { success: true };
}

export async function deleteExperiencia(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await experienciaRepo.remove(id);
  revalidatePath("/experiencias");
  revalidatePath("/");
}

/** Persiste a nova ordem (lista de ids na sequência desejada). */
export async function reorderExperiencias(ids: number[]): Promise<void> {
  await requireUser();

  await Promise.all(
    ids.map((id, i) => experienciaRepo.update(id, { sortOrder: i })),
  );
  revalidatePath("/experiencias");
  revalidatePath("/");
}
