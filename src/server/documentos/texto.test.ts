import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * O fallback por IA custa uma chamada ao modelo e produz texto que é
 * reprodução, não cópia. Os testes garantem que ele só entra quando não há
 * alternativa — e nunca quando a extração direta já resolveu.
 */

const extractTextFromPdf = vi.fn();
const extractTextFromDocx = vi.fn();
const transcreverDocumento = vi.fn();

vi.mock("@/server/pdf/extract", async () => {
  const real = await vi.importActual<typeof import("@/server/pdf/extract")>(
    "@/server/pdf/extract",
  );
  return {
    ...real,
    extractTextFromPdf: (b: Buffer) => extractTextFromPdf(b),
    extractTextFromDocx: (b: Buffer) => extractTextFromDocx(b),
  };
});

vi.mock("@/server/ai/ocr", () => ({
  transcreverDocumento: (b: Buffer, m?: string) => transcreverDocumento(b, m),
  DocumentoGrandeDemais: class extends Error {},
}));

vi.mock("server-only", () => ({}));

const { extrairTexto } = await import("./texto");

const buf = Buffer.from("%PDF-1.7 fake");
const TEXTO_REAL =
  "To whom it may concern, Bryan worked with us from 2024 to 2025 as a developer and delivered three projects.";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extrairTexto", () => {
  it("usa a extração direta quando o PDF tem texto — e NÃO chama a IA", async () => {
    extractTextFromPdf.mockResolvedValue(TEXTO_REAL);

    const r = await extrairTexto(buf, "pdf");

    expect(r.texto).toBe(TEXTO_REAL);
    expect(r.viaOcr).toBe(false);
    expect(transcreverDocumento).not.toHaveBeenCalled();
  });

  /**
   * Regressão do caso real: as cartas escaneadas extraíam só marcadores de
   * página ("-- 1 of 2 --"). Isso tem comprimento, mas não é texto.
   */
  it("cai para a IA quando o PDF só devolve marcadores de página", async () => {
    extractTextFromPdf.mockResolvedValue("-- 1 of 2 --\n\n\n\n-- 2 of 2 --");
    transcreverDocumento.mockResolvedValue(TEXTO_REAL);

    const r = await extrairTexto(buf, "pdf");

    expect(r.texto).toBe(TEXTO_REAL);
    expect(r.viaOcr).toBe(true);
    expect(transcreverDocumento).toHaveBeenCalledOnce();
  });

  it("cai para a IA quando a extração direta lança", async () => {
    extractTextFromPdf.mockRejectedValue(new Error("DOMMatrix is not defined"));
    transcreverDocumento.mockResolvedValue(TEXTO_REAL);

    const r = await extrairTexto(buf, "pdf");

    expect(r.viaOcr).toBe(true);
    expect(r.texto).toBe(TEXTO_REAL);
  });

  it("NÃO tenta IA para DOCX — não há imagem a ler", async () => {
    extractTextFromDocx.mockResolvedValue("");

    const r = await extrairTexto(buf, "docx");

    expect(r.texto).toBeNull();
    expect(r.viaOcr).toBe(false);
    expect(transcreverDocumento).not.toHaveBeenCalled();
    expect(r.motivo).toMatch(/não contém texto/i);
  });

  it("reporta motivo quando nem a IA encontra texto", async () => {
    extractTextFromPdf.mockResolvedValue("");
    transcreverDocumento.mockResolvedValue("");

    const r = await extrairTexto(buf, "pdf");

    expect(r.texto).toBeNull();
    expect(r.viaOcr).toBe(false);
    expect(r.motivo).toMatch(/nem a extração direta nem a leitura por IA/i);
  });

  it("não deixa a falha da IA derrubar o upload — devolve motivo", async () => {
    extractTextFromPdf.mockResolvedValue("");
    transcreverDocumento.mockRejectedValue(new Error("cota excedida"));

    const r = await extrairTexto(buf, "pdf");

    expect(r.texto).toBeNull();
    expect(r.motivo).toMatch(/cota excedida/);
  });
});
