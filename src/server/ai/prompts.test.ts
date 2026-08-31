import { describe, it, expect, vi, afterEach } from "vitest";
import {
  contextoDeData,
  WRITER_SYSTEM_PROMPT,
  WRITER_REGRAS_IMUTAVEIS,
} from "./prompts";

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

describe("WRITER_SYSTEM_PROMPT", () => {
  /**
   * Regressão que já aconteceu duas vezes. O prompt trazia
   * "Impulsionei vendas em 40%" e "reduzindo tempo de resposta em 60%" como
   * EXEMPLOS DE BULLET BOM, vinte linhas antes da regra que proíbe inventar
   * números — e few-shot pesa mais que instrução.
   *
   * A Fase 2 do projeto removeu esse texto do aiWriter.js legado; a migração
   * para TypeScript o trouxe de volta. Este teste existe para a terceira vez
   * não acontecer em silêncio.
   */
  it("não ensina a inventar métrica pelo exemplo", () => {
    const exemplos = WRITER_SYSTEM_PROMPT.split("REGRA CRÍTICA DE MÉTRICAS")[0];
    expect(exemplos).not.toMatch(/✅ Bom:.*\d+\s*%/);
    expect(exemplos).not.toContain("Impulsionei vendas em 40%");
  });

  /**
   * A regra saiu do WRITER_SYSTEM_PROMPT para WRITER_REGRAS_IMUTAVEIS quando os
   * prompts viraram editáveis: o que o usuário pode reescrever é o estilo, e a
   * regra é concatenada depois, fora do alcance do editor.
   */
  it("mantém a regra de métricas fora do texto editável", () => {
    expect(WRITER_REGRAS_IMUTAVEIS).toContain("metric_grounded");
    expect(WRITER_REGRAS_IMUTAVEIS).toMatch(/NUNCA invente/i);
    // Se voltar para o texto editável, é porque alguém desfez a separação.
    expect(WRITER_SYSTEM_PROMPT).not.toContain("metric_grounded");
  });
});
