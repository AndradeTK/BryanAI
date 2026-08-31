"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { settingsRepo } from "@/server/db/repositories";
import { DEFAULT_SECTIONS_ORDER } from "@/server/db/schema";
import { randomBytes, createHash } from "node:crypto";
import { publicTokenRepo } from "@/server/db/repositories";

export type ActionState = { error?: string; success?: boolean };
/** O token em claro só volta uma vez, no retorno da action que o cria. */
export type TokenState = { token?: string; error?: string };

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

/**
 * Cria um link de leitura do perfil e devolve o token EM CLARO — a única vez
 * que ele existe fora do hash. Quem não copiar agora precisa criar outro.
 */
export async function criarTokenPublico(
  _prev: TokenState,
  formData: FormData,
): Promise<TokenState> {
  await requireUser();

  const label = String(formData.get("label") ?? "").trim().slice(0, 100) || null;
  // Contato sai do documento por padrão; liberar é uma escolha explícita.
  const redactContact = formData.get("incluirContato") !== "on";
  const dias = Number(formData.get("expiraEmDias"));
  const expiresAt =
    Number.isFinite(dias) && dias > 0
      ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
      : null;

  const token = randomBytes(32).toString("base64url");
  await publicTokenRepo.create({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    label,
    redactContact,
    expiresAt,
  });

  revalidatePath("/settings");
  return { token };
}

export async function revogarTokenPublico(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await publicTokenRepo.remove(id);
  revalidatePath("/settings");
}
