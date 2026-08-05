import { describe, it, expect, vi, afterEach } from "vitest";
import { contextoDeData } from "./prompts";

afterEach(() => {
  vi.useRealTimers();
});

describe("contextoDeData", () => {
  it("informa a data corrente em formato ISO", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));
    expect(contextoDeData()).toContain("2026-08-05");
  });

  /**
   * Regressão: sem a data no prompt, o modelo usava a própria data de
   * treinamento como referência e acusava como "datas futuras" um emprego
   * iniciado em out/2025 e um curso concluído em dez/2025 — ambos passado.
   */
  it("instrui o modelo a não tratar datas passadas como inconsistência", () => {
    const texto = contextoDeData().toLowerCase();
    expect(texto).toContain("passado");
    expect(texto).toMatch(/já realizadas|nao as trate|não as trate/);
  });

  it("acompanha a passagem do tempo — não é congelado na carga do módulo", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));
    const agosto = contextoDeData();

    vi.setSystemTime(new Date("2027-01-15T12:00:00Z"));
    const janeiro = contextoDeData();

    expect(agosto).toContain("2026-08-05");
    expect(janeiro).toContain("2027-01-15");
    expect(agosto).not.toBe(janeiro);
  });
});
