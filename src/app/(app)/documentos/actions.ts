"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { documentRepo } from "@/server/db/repositories";
import { generateFilename, saveGenerated, resolveInside } from "@/server/pdf/storage";
import { extractTextFromPdf, detectFileType, temTextoUtil } from "@/server/pdf/extract";
import { unlink } from "node:fs/promises";
import type { NewDocument } from "@/server/db/schema";

export type ActionState = { error?: string; success?: boolean; aviso?: string };

/**
 * Upload de um documento do usuário (reference letter etc.). Salva o PDF no
 * volume `generated` (reusa o storage/route de download) e extrai o texto para
 * a IA. DOCX/imagem: guardamos o arquivo, mas sem texto extraído.
 */
export async function uploadDocument(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const title = (formData.get("title") as string | null)?.trim();
  const kind = formData.get("kind") === "other" ? "other" : "reference_letter";
  const jobIdRaw = formData.get("jobId") as string | null;
  const jobId = jobIdRaw && jobIdRaw !== "" ? Number(jobIdRaw) : null;
  const file = formData.get("arquivo");

  if (!title) return { error: "Dê um título ao documento." };
  if (!(file instanceof File) || file.size === 0)
    return { error: "Selecione um arquivo PDF." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const tipo = detectFileType(buffer, file.type, file.name);
  if (tipo !== "pdf")
    return { error: "Por enquanto só PDF é aceito (com texto selecionável)." };

  let extractedText: string | null = null;
  let falhaExtracao = false;
  try {
    const texto = await extractTextFromPdf(buffer);
    extractedText = temTextoUtil(texto) ? texto : null;
  } catch {
    falhaExtracao = true;
  }

  const filename = generateFilename("DOC", "pdf");
  await saveGenerated(filename, buffer);

  /**
   * Sem texto, a IA não tem o que ler — então o documento entra com
   * `useForAi: false`. Antes ele era marcado como utilizável de qualquer jeito,
   * e o usuário ficava achando que as conquistas da carta entrariam no
   * currículo enquanto o modelo recebia uma string vazia.
   */
  const data: NewDocument = {
    kind,
    title,
    filename,
    extractedText,
    useForAi: kind === "reference_letter" && extractedText !== null,
    jobId,
  };
  await documentRepo.create(data);

  revalidatePath("/documentos");

  if (extractedText === null) {
    return {
      success: true,
      aviso: falhaExtracao
        ? "Documento salvo, mas não consegui ler o PDF. Ele fica disponível para download e anexo, mas a IA não vai usar o conteúdo."
        : "Documento salvo, mas este PDF é um escaneamento (imagem, sem texto selecionável). Ele fica disponível para download e anexo, mas a IA não consegue ler o conteúdo. Para a IA aproveitar as conquistas descritas nele, envie uma versão com texto — ou copie o texto para a descrição de uma experiência.",
    };
  }
  return { success: true };
}

/** Vincula/desvincula o documento a uma vaga do kanban. */
export async function linkDocumentToJob(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  const jobIdRaw = formData.get("jobId") as string | null;
  const jobId = jobIdRaw && jobIdRaw !== "" ? Number(jobIdRaw) : null;
  if (id) await documentRepo.update(id, { jobId });
  revalidatePath("/documentos");
}

/** Liga/desliga o uso do documento pela IA. */
export async function toggleDocumentAi(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  const useForAi = formData.get("useForAi") === "true";
  if (id) await documentRepo.update(id, { useForAi });
  revalidatePath("/documentos");
}

/** Remove o documento (registro + arquivo do volume). */
export async function deleteDocument(formData: FormData) {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return;
  const doc = await documentRepo.getById(id);
  if (doc) {
    try {
      await unlink(resolveInside(doc.filename));
    } catch {
      // arquivo já ausente — segue removendo o registro
    }
    await documentRepo.remove(id);
  }
  revalidatePath("/documentos");
}
