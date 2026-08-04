/**
 * Extração de texto de PDF/DOCX a partir de buffer (nunca toca o disco).
 * Portado da Fase 1 — sem os fallbacks removidos (Puppeteer no PDF, textract).
 */

/**
 * Detecta o tipo do arquivo pelos magic bytes do buffer, com o mimetype e o
 * nome como pistas secundárias. Não confia só no mimetype (pode vir vazio ou
 * errado num upload).
 */
export function detectFileType(
  buffer: Buffer,
  mimetype?: string,
  filename?: string,
): "pdf" | "docx" | "unknown" {
  // Magic bytes: PDF começa com "%PDF", DOCX (zip/OOXML) com "PK".
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF") return "pdf";
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) return "docx";
  // Fallback por mimetype/extensão.
  if (mimetype === "application/pdf" || filename?.toLowerCase().endsWith(".pdf"))
    return "pdf";
  if (
    mimetype?.includes("wordprocessingml") ||
    filename?.toLowerCase().endsWith(".docx")
  )
    return "docx";
  return "unknown";
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2: classe PDFParse (API diferente do v1).
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text || "";
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}
