/**
 * Extração de texto de PDF/DOCX a partir de buffer (nunca toca o disco).
 * Portado da Fase 1 — sem os fallbacks removidos (Puppeteer no PDF, textract).
 */

/**
 * Detecta o tipo do arquivo pelos magic bytes do buffer, com o mimetype e o
 * nome como pistas secundárias. Não confia só no mimetype (pode vir vazio ou
 * errado num upload).
 */
export type TipoArquivo = "pdf" | "docx" | "unknown";

export function detectFileType(
  buffer: Buffer,
  mimetype?: string,
  filename?: string,
): TipoArquivo {
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

/**
 * Extrai o texto de um PDF.
 *
 * Depende de `@napi-rs/canvas` estar instalado: o pdf-parse v2 usa pdfjs-dist,
 * que precisa dos polyfills de DOM (DOMMatrix, ImageData, Path2D). Sem esse
 * pacote o `import` abaixo lança "DOMMatrix is not defined" e TODA extração
 * falha — importar CV, analisar currículo externo e ler documento anexado.
 * Ele não é importado aqui de propósito: o pdfjs o carrega sozinho quando está
 * presente; a dependência existe só para garantir que esteja.
 *
 * Retorna string vazia (ou quase) para PDF escaneado — nesse caso o arquivo é
 * imagem, e sem OCR não há texto a recuperar. Quem chama precisa tratar isso
 * como "sem texto", não como sucesso.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2: classe PDFParse (API diferente do v1).
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text || "";
}

/**
 * O pdfjs devolve marcadores de página mesmo num PDF sem texto algum
 * ("-- 1 of 2 --"). Contar caracteres crus daria falso positivo, então a
 * checagem ignora esses marcadores antes de decidir se há conteúdo.
 */
export function temTextoUtil(texto: string, minimo = 30): boolean {
  const semMarcadores = texto.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "").trim();
  return semMarcadores.length >= minimo;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}
