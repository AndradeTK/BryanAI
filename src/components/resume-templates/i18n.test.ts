import { describe, it, expect } from "vitest";
import { sectionTitles, translateTerm, canadianSpelling } from "./i18n";

describe("i18n dos templates", () => {
  it("traduz títulos de seção por idioma", () => {
    expect(sectionTitles("pt-BR").summary).toBe("Resumo Profissional");
    expect(sectionTitles("en").summary).toBe("Professional Summary");
    expect(sectionTitles("fr").summary).toBe("Résumé Professionnel");
  });

  it("usa títulos canadenses em en-CA/fr-CA", () => {
    expect(sectionTitles("en-CA").summary).toBe("Professional Summary");
    expect(sectionTitles("en-CA").experience).toBe("Work Experience");
    expect(sectionTitles("fr-CA").summary).toBe("Sommaire Professionnel");
  });

  it("aplica grafia canadense a qualquer inglês", () => {
    expect(canadianSpelling("center", "en")).toBe("centre");
    expect(canadianSpelling("Colored labor", "en-CA")).toBe("Coloured labour");
    // fora de inglês é no-op
    expect(canadianSpelling("center", "pt-BR")).toBe("center");
  });

  it("traduz termos dinâmicos (níveis, status)", () => {
    expect(translateTerm("Avançado", "en")).toBe("Advanced");
    expect(translateTerm("Concluído", "fr")).toBe("Terminé");
    expect(translateTerm("Inglês", "en")).toBe("English");
  });

  it("não traduz em pt-BR", () => {
    expect(translateTerm("Avançado", "pt-BR")).toBe("Avançado");
  });
});
