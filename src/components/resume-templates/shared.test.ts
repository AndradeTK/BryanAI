import { describe, it, expect } from "vitest";
import { isUrl, stripUrl, resolveOrder } from "./shared";
import { DEFAULT_SECTION_ORDER, type SectionName } from "./types";

describe("isUrl — filtra links que a IA preencheu com lixo", () => {
  it("aceita URLs reais", () => {
    expect(isUrl("https://github.com/AndradeTK")).toBe(true);
    expect(isUrl("github.com/AndradeTK")).toBe(true);
    expect(isUrl("linkedin.com/in/andradetk/")).toBe(true);
  });

  it("rejeita valores não-URL da IA (o bug do 'Not Applicable')", () => {
    expect(isUrl("Not Applicable")).toBe(false);
    expect(isUrl("N/A")).toBe(false);
    expect(isUrl("Não informado")).toBe(false);
    expect(isUrl("")).toBe(false);
    expect(isUrl(null)).toBe(false);
    expect(isUrl(undefined)).toBe(false);
  });
});

describe("stripUrl", () => {
  it("encurta URLs conhecidas", () => {
    expect(stripUrl("https://github.com/x")).toBe("github.com/x");
    expect(stripUrl("https://www.linkedin.com/in/y")).toBe("linkedin.com/in/y");
  });
});

describe("resolveOrder", () => {
  it("usa a ordem canadense padrão quando não há config", () => {
    expect(resolveOrder()).toEqual(DEFAULT_SECTION_ORDER);
    expect(resolveOrder([])).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("respeita a ordem escolhida pelo usuário", () => {
    const escolhida: SectionName[] = [
      "skills",
      "summary",
      "experience",
      "education",
      "certifications",
      "languages",
      "projects",
      "leadership",
    ];
    expect(resolveOrder(escolhida)).toEqual(escolhida);
  });

  /**
   * Regressão: quem salvou a ordem antes de "leadership" existir tinha uma
   * config sem essa seção. Devolver a lista salva crua fazia a seção nova
   * nunca renderizar — sem erro, sem aviso.
   */
  it("acrescenta no fim uma seção que a config antiga não conhece", () => {
    const antiga = [
      "summary",
      "experience",
      "skills",
      "education",
      "certifications",
      "languages",
      "projects",
    ] as SectionName[];
    const r = resolveOrder(antiga);
    expect(r).toContain("leadership");
    expect(r[r.length - 1]).toBe("leadership");
    expect(r.slice(0, 7)).toEqual(antiga);
  });
});
