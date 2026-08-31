"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { experienciaRepo, anexoRepo } from "@/server/db/repositories";

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
  if (id) {
    // O vínculo dos anexos é polimórfico, então não há FK para o Postgres
    // cascatear: sem isto sobrariam linhas apontando para uma experiência que
    // não existe mais, e o próximo id reaproveitado herdaria anexos alheios.
    await anexoRepo.removeDaEntidade("experiencia", id);
    await experienciaRepo.remove(id);
  }
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

/**
 * Anexa um link a uma experiência — certificado, repositório, artigo.
 *
 * Só link por enquanto: upload de arquivo já existe em /documentos, e
 * duplicar aquele fluxo aqui traria o mesmo problema de armazenamento sem
 * resolver a dor imediata, que é apontar para uma referência externa.
 *
 * Nunca entra no currículo gerado — é material de consulta.
 */
export async function addAnexoExperiencia(formData: FormData): Promise<void> {
  await requireUser();

  const entidadeId = Number(formData.get("entidadeId"));
  const rotulo = String(formData.get("rotulo") ?? "").trim().slice(0, 150);
  const url = String(formData.get("url") ?? "").trim().slice(0, 1000);
  if (!entidadeId || !rotulo || !url) return;

  await anexoRepo.create({
    entidade: "experiencia",
    entidadeId,
    rotulo,
    url,
  });
  revalidatePath("/experiencias");
}

export async function removeAnexoExperiencia(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await anexoRepo.remove(id);
  revalidatePath("/experiencias");
}
