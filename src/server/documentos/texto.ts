import "server-only";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  temTextoUtil,
  type TipoArquivo,
} from "@/server/pdf/extract";
import { transcreverDocumento } from "@/server/ai/ocr";

/**
 * Obtém o texto de um documento, com fallback para leitura por IA.
 *
 * Estratégia em duas etapas:
 *   1. Extração nativa (pdfjs para PDF, mammoth para DOCX). Rápida, gratuita e
 *      fiel — é literalmente o texto que está no arquivo.
 *   2. Só se a primeira não achar nada e o arquivo for PDF: manda ao Gemini,
 *      que lê o documento como imagem. É o caso do escaneamento.
 *
 * A ordem importa por custo e por confiabilidade: quando o PDF tem texto de
 * verdade, extraí-lo é exato; a transcrição por modelo, por melhor que seja,
 * é uma reprodução. Só se usa quando não há alternativa.
 */
export interface ResultadoTexto {
  texto: string | null;
  /** true quando o texto veio do modelo, não do arquivo. */
  viaOcr: boolean;
  /** Preenchido quando nem a extração nem o OCR conseguiram. */
  motivo?: string;
}

export async function extrairTexto(
  buffer: Buffer,
  tipo: Exclude<TipoArquivo, "unknown">,
): Promise<ResultadoTexto> {
  // ---- 1. extração nativa ----
  let nativo = "";
  try {
    nativo =
      tipo === "pdf"
        ? await extractTextFromPdf(buffer)
        : await extractTextFromDocx(buffer);
  } catch (e) {
    console.warn("[texto] extração nativa falhou:", (e as Error).message);
  }

  if (temTextoUtil(nativo)) {
    return { texto: nativo, viaOcr: false };
  }

  // DOCX sem texto é DOCX vazio — não há imagem a ler, então OCR não ajuda.
  if (tipo !== "pdf") {
    return {
      texto: null,
      viaOcr: false,
      motivo: "O arquivo não contém texto.",
    };
  }

  // ---- 2. fallback: o modelo lê o PDF como imagem ----
  try {
    const transcrito = await transcreverDocumento(buffer, "application/pdf");
    if (temTextoUtil(transcrito)) {
      return { texto: transcrito, viaOcr: true };
    }
    return {
      texto: null,
      viaOcr: false,
      motivo: "Nem a extração direta nem a leitura por IA encontraram texto.",
    };
  } catch (e) {
    return {
      texto: null,
      viaOcr: false,
      motivo: `O PDF não tem texto selecionável e a leitura por IA falhou: ${(e as Error).message}`,
    };
  }
}
