import { describe, it, expect } from "vitest";
import { PROMPTS_EDITAVEIS, ehChaveValida } from "./promptsCustom";

describe("PROMPTS_EDITAVEIS", () => {
  it("aceita só as chaves conhecidas", () => {
    expect(ehChaveValida("writer")).toBe(true);
    expect(ehChaveValida("analyzer")).toBe(true);
    expect(ehChaveValida("qualquer_outra")).toBe(false);
  });

  /**
   * O ponto inteiro da separação: o texto que o editor mostra não pode conter
   * a regra anti-alucinação, senão o usuário consegue apagá-la sem perceber.
   */
  it("não expõe a regra de métricas no texto editável do writer", () => {
    expect(PROMPTS_EDITAVEIS.writer.padrao).not.toContain("metric_grounded");
    expect(PROMPTS_EDITAVEIS.writer.padrao).not.toMatch(/NUNCA invente/i);
  });

  it("guarda a regra de métricas no bloco imutável", () => {
    expect(PROMPTS_EDITAVEIS.writer.imutavel).toContain("metric_grounded");
    expect(PROMPTS_EDITAVEIS.writer.imutavel).toMatch(/NUNCA invente/i);
  });

  it("todo prompt editável tem rótulo e descrição para a tela", () => {
    for (const spec of Object.values(PROMPTS_EDITAVEIS)) {
      expect(spec.label.length).toBeGreaterThan(0);
      expect(spec.descricao.length).toBeGreaterThan(0);
      expect(spec.padrao.length).toBeGreaterThan(0);
    }
  });
});
