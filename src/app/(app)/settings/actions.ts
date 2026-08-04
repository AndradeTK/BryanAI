"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { settingsRepo } from "@/server/db/repositories";
import { DEFAULT_SECTIONS_ORDER } from "@/server/db/schema";

export type ActionState = { error?: string; success?: boolean };

const TEMPLATES = ["minimalista", "executivo", "tech", "harvard", "classico"];
const IDIOMAS = ["pt-BR", "en", "en-CA", "fr", "fr-CA"];

/** Salva as configurações (registro único). Assinatura para useActionState. */
export async function saveSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const templatePadrao = String(formData.get("templatePadrao") ?? "minimalista");
  const idiomaDefault = String(formData.get("idiomaDefault") ?? "pt-BR");

  if (!TEMPLATES.includes(templatePadrao))
    return { error: "Template inválido." };
  if (!IDIOMAS.includes(idiomaDefault))
    return { error: "Idioma inválido." };

  const limite = Number(formData.get("limiteCertificacoes"));

  await settingsRepo.update({
    templatePadrao,
    idiomaDefault,
    darkMode: formData.get("darkMode") === "on",
    preferencias: {
      incluirProjetos: formData.get("incluirProjetos") === "on",
      mostrarPortfolio: formData.get("mostrarPortfolio") === "on",
      mostrarGithub: formData.get("mostrarGithub") === "on",
      limiteCertificacoes: Number.isFinite(limite) && limite > 0 ? limite : 6,
      formatoDataExperiencia: String(
        formData.get("formatoDataExperiencia") ?? "MMM YYYY",
      ),
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

/** Reordena as seções do currículo. */
export async function saveSectionsOrder(order: string[]): Promise<void> {
  await requireUser();

  const valid = new Set(DEFAULT_SECTIONS_ORDER);
  if (!order.every((s) => valid.has(s as (typeof DEFAULT_SECTIONS_ORDER)[number])))
    throw new Error("Seções inválidas.");
  await settingsRepo.update({ sectionsOrder: order });
  revalidatePath("/settings");
}
