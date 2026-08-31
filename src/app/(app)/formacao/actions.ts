"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { formacaoRepo, anexoRepo } from "@/server/db/repositories";

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
  if (tipo !== "educacao" && tipo !== "projeto" && tipo !== "atividade")
    return { error: "Tipo inválido." };
  const instituicaoProjeto = get("instituicaoProjeto");
  if (!instituicaoProjeto)
    return { error: "Instituição/Projeto é obrigatório." };

  const idRaw = get("id");
  const id = idRaw ? Number(idRaw) : null;
  const data = {
    tipo: tipo as "educacao" | "projeto" | "atividade",
    instituicaoProjeto,
    tituloCurso: get("tituloCurso"),
    status: get("status"),
    descricaoDetalhada: get("descricaoDetalhada"),
    link: get("link"),
    papel: get("papel"),
    periodoInicio: get("periodoInicio"),
    periodoFim: get("periodoFim"),
    noCanada: formData.get("noCanada") === "on" || formData.get("noCanada") === "true",
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
  if (id) {
    // Vínculo polimórfico não cascateia: limpar aqui evita anexo órfão.
    await anexoRepo.removeDaEntidade("formacao", id);
    await formacaoRepo.remove(id);
  }
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

/** Anexa um link a uma formação, projeto ou atividade. Não vai ao currículo. */
export async function addAnexoFormacao(formData: FormData): Promise<void> {
  await requireUser();

  const entidadeId = Number(formData.get("entidadeId"));
  const rotulo = String(formData.get("rotulo") ?? "").trim().slice(0, 150);
  const url = String(formData.get("url") ?? "").trim().slice(0, 1000);
  if (!entidadeId || !rotulo || !url) return;

  await anexoRepo.create({ entidade: "formacao", entidadeId, rotulo, url });
  revalidatePath("/formacao");
}

export async function removeAnexoFormacao(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await anexoRepo.remove(id);
  revalidatePath("/formacao");
}
