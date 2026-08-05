import { describe, it, expect } from "vitest";
import { temTextoUtil, detectFileType } from "./extract";

describe("temTextoUtil", () => {
  /**
   * Regressão: o pdfjs devolve marcadores de página mesmo num PDF que é só
   * imagem. As duas cartas de recomendação reais extraíam "-- 1 of 1 --" e
   * "-- 1 of 2 --\n\n\n\n-- 2 of 2 --" — 12 e 28 caracteres. Uma checagem por
   * comprimento cru daria "tem texto" para o segundo, e o documento entraria
   * marcado como legível pela IA com nada dentro.
   */
  it("reconhece PDF escaneado, apesar dos marcadores de página", () => {
    expect(temTextoUtil("-- 1 of 1 --")).toBe(false);
    expect(temTextoUtil("-- 1 of 2 --\n\n\n\n-- 2 of 2 --")).toBe(false);
    expect(temTextoUtil("-- 1 of 12 --\n-- 2 of 12 --\n-- 3 of 12 --")).toBe(false);
  });

  it("aceita texto real", () => {
    const real =
      "Sep 22, 2025 — Bryan concluiu Technical Support Fundamentals, um curso on-line autorizado pela Google.";
    expect(temTextoUtil(real)).toBe(true);
  });

  it("aceita texto real mesmo acompanhado de marcadores", () => {
    const misto =
      "-- 1 of 2 --\nTo whom it may concern, Bryan worked with us from 2024 to 2025 as a developer.\n-- 2 of 2 --";
    expect(temTextoUtil(misto)).toBe(true);
  });

  it("recusa vazio e só espaços", () => {
    expect(temTextoUtil("")).toBe(false);
    expect(temTextoUtil("   \n\n  \t ")).toBe(false);
  });

  it("respeita o mínimo configurável", () => {
    expect(temTextoUtil("texto curto", 5)).toBe(true);
    expect(temTextoUtil("texto curto", 200)).toBe(false);
  });
});

describe("detectFileType", () => {
  it("identifica por magic bytes, não pelo mimetype declarado", () => {
    const pdf = Buffer.from("%PDF-1.7\n...");
    // Mimetype mentindo: ainda assim é PDF.
    expect(detectFileType(pdf, "application/msword", "x.doc")).toBe("pdf");

    const docx = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(detectFileType(docx, "application/pdf", "x.pdf")).toBe("docx");
  });

  it("cai para mimetype/extensão quando os bytes não dizem nada", () => {
    const nada = Buffer.from("qualquer coisa");
    expect(detectFileType(nada, "application/pdf")).toBe("pdf");
    expect(detectFileType(nada, undefined, "curriculo.docx")).toBe("docx");
    expect(detectFileType(nada, undefined, "foto.png")).toBe("unknown");
  });
});
