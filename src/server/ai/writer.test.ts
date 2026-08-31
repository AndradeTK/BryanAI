import { describe, it, expect } from "vitest";
import { empresasForaDosDados } from "./writer";
import type { Curriculo } from "./types";

const curriculo: Curriculo = {
  experiencias: [
    { empresa: "Freelancer" },
    { empresa: "Tio Adriano - Transporte Escolar" },
    { empresa: "Tribunal de Justiça do Estado de São Paulo - Comarca de Salto" },
  ],
};

const exp = (empresa: string) => ({
  empresa,
  cargo: "x",
  periodo: "2020",
  bullets: [],
});

describe("empresasForaDosDados", () => {
  it("aceita o nome exatamente igual", () => {
    expect(
      empresasForaDosDados(curriculo, { experiencias: [exp("Freelancer")] }),
    ).toEqual([]);
  });

  /**
   * Regressão real: a IA encurtou "Tribunal de Justiça do Estado de São Paulo
   * - Comarca de Salto" para "Tribunal de Justiça do Estado de São Paulo" e a
   * comparação exata acusou invenção. Encurtar não é inventar.
   */
  it("aceita o nome encurtado pela IA", () => {
    expect(
      empresasForaDosDados(curriculo, {
        experiencias: [exp("Tribunal de Justiça do Estado de São Paulo")],
      }),
    ).toEqual([]);
  });

  it("aceita diferença de acento e pontuação", () => {
    expect(
      empresasForaDosDados(curriculo, {
        experiencias: [exp("Tio Adriano — Transporte Escolar")],
      }),
    ).toEqual([]);
  });

  /** O caso que a checagem existe para pegar: fato novo. */
  it("acusa empresa que não tem relação com os dados", () => {
    expect(
      empresasForaDosDados(curriculo, { experiencias: [exp("Google")] }),
    ).toEqual(["Google"]);
  });

  it("não acusa nada quando o candidato não tem experiências cadastradas", () => {
    expect(
      empresasForaDosDados({}, { experiencias: [exp("Qualquer Coisa")] }),
    ).toEqual([]);
  });
});
