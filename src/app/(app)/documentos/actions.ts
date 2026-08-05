"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { documentRepo } from "@/server/db/repositories";
import { generateFilename, saveGenerated, resolveInside } from "@/server/pdf/storage";
import { detectFileType } from "@/server/pdf/extract";
import { extrairTexto } from "@/server/documentos/texto";
import { unlink } from "node:fs/promises";
import type { NewDocument } from "@/server/db/schema";

export type ActionState = { error?: string; success?: boolean; aviso?: string };

/**
 * Upload de um documento do usuário (reference letter etc.). Salva o arquivo no
 * volume `generated` (reusa o storage/route de download) e extrai o texto para
 * a IA.
 *
 * Aceita PDF e DOCX. Carta de recomendação costuma chegar nos dois formatos, e
 * o DOCX tem a vantagem de sempre ter texto de verdade — é o PDF que às vezes
 * vem como escaneamento.
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
    return { error: "Selecione um arquivo PDF ou DOCX." };

  const buffer = Buffer.from(await file.arrayBuffer());
  // Detecta pelos magic bytes: o mimetype do navegador vem errado com alguma
  // frequência, sobretudo em DOCX (que é um zip).
  const tipo = detectFileType(buffer, file.type, file.name);
  if (tipo === "unknown")
    return { error: "Formato não suportado. Envie um PDF ou um DOCX." };

  // Extração nativa e, se o PDF for escaneado, leitura por IA.
  const { texto, viaOcr, motivo } = await extrairTexto(buffer, tipo);

  const filename = generateFilename("DOC", tipo === "pdf" ? "pdf" : "docx");
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
    extractedText: texto,
    textoViaOcr: viaOcr,
    useForAi: kind === "reference_letter" && texto !== null,
    jobId,
  };
  await documentRepo.create(data);

  revalidatePath("/documentos");

  if (texto === null) {
    return {
      success: true,
      aviso: `Documento salvo, mas sem texto aproveitável. ${motivo ?? ""} Ele continua disponível para download e anexo; a IA é que não vai usar o conteúdo.`.trim(),
    };
  }
  if (viaOcr) {
    return {
      success: true,
      aviso:
        "Documento salvo. Este PDF é um escaneamento, então o texto foi lido por IA — confira a transcrição abaixo antes de gerar currículos com ele. Diferente da extração direta, uma transcrição pode conter erros de leitura.",
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
