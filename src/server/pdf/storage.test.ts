import { describe, it, expect } from "vitest";
import { resolveInside, generateFilename, contentTypeFor } from "./storage";
import { detectFileType } from "./extract";

describe("detectFileType — não confia só no mimetype", () => {
  it("detecta PDF por magic bytes mesmo com mimetype vazio", () => {
    const pdf = Buffer.from("%PDF-1.4\n...");
    expect(detectFileType(pdf, "")).toBe("pdf");
    expect(detectFileType(pdf, "application/octet-stream")).toBe("pdf");
  });

  it("detecta DOCX por magic bytes (PK)", () => {
    const docx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(detectFileType(docx, "")).toBe("docx");
  });

  it("fallback por extensão quando magic bytes não batem", () => {
    const generic = Buffer.from("texto qualquer");
    expect(detectFileType(generic, "", "curriculo.pdf")).toBe("pdf");
    expect(detectFileType(generic, "", "cv.docx")).toBe("docx");
  });

  it("retorna unknown quando nada bate", () => {
    expect(detectFileType(Buffer.from("xyz"), "", "arquivo.txt")).toBe("unknown");
  });
});

describe("storage — path traversal", () => {
  it("aceita nome de arquivo válido", () => {
    expect(() => resolveInside("CV_Bryan_123.pdf")).not.toThrow();
  });

  it("rejeita path traversal (..)", () => {
    expect(() => resolveInside("../package.json")).toThrow("inválido");
    expect(() => resolveInside("../../etc/passwd")).toThrow("inválido");
  });

  it("rejeita caminho absoluto", () => {
    expect(() => resolveInside("/etc/passwd")).toThrow("inválido");
  });

  it("gera filename com extensão", () => {
    const f = generateFilename("CV_Bryan", "pdf");
    expect(f).toMatch(/^CV_Bryan_.*\.pdf$/);
  });

  it("content-type por extensão", () => {
    expect(contentTypeFor("x.pdf")).toBe("application/pdf");
    expect(contentTypeFor("x.docx")).toContain("wordprocessingml");
    expect(contentTypeFor("x.bin")).toBe("application/octet-stream");
  });
});
