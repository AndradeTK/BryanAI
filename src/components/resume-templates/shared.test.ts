import { describe, it, expect } from "vitest";
import { isUrl, stripUrl } from "./shared";

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
