import { describe, it, expect, vi, afterEach } from "vitest";
import { recortar } from "./analyzer";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recortar", () => {
  it("devolve o texto intacto quando cabe no limite", () => {
    const texto = "uma vaga curta";
    expect(recortar(texto, 100, "vaga")).toBe(texto);
  });

  it("não avisa no log quando não precisou cortar", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    recortar("curto", 100, "vaga");
    expect(warn).not.toHaveBeenCalled();
  });

  /**
   * Regressão: os limites antigos (1000 caracteres para a vaga) cortavam
   * silenciosamente com `substring`. Numa vaga de ATS corporativo os
   * requisitos obrigatórios costumam vir no fim, então a análise devolvia um
   * score com cara de definitivo tendo lido só o começo do anúncio.
   */
  it("deixa rastro no log quando corta", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    recortar("x".repeat(500), 100, "descrição da vaga");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("descrição da vaga");
  });

  it("avisa o modelo, no próprio texto, de que houve corte", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const saida = recortar("x".repeat(500), 100, "vaga");
    expect(saida).toContain("[...texto truncado por limite de tamanho...]");
  });

  it("quebra num parágrafo quando há um perto do limite", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // Parágrafo termina em 95, dentro dos 80% do limite de 100.
    const texto = "a".repeat(95) + "\n" + "b".repeat(200);
    const saida = recortar(texto, 100, "vaga");
    expect(saida).toContain("a".repeat(95));
    expect(saida).not.toContain("b");
  });

  it("corta no limite exato quando a quebra ficaria cedo demais", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // A única quebra está em 10 — cortar ali jogaria fora quase tudo.
    const texto = "a".repeat(10) + "\n" + "b".repeat(500);
    const saida = recortar(texto, 100, "vaga");
    expect(saida.length).toBeGreaterThan(90);
  });
});
