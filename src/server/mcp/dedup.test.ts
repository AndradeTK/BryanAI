import { describe, it, expect } from "vitest";
import { chave } from "@/server/perfil/importarTexto";

/**
 * O import só vale se trouxer o que FALTA. Sem essa comparação, você tem 4
 * experiências, o LinkedIn traz as mesmas 4, e a fila nasce com 4 propostas
 * para aprovar coisas que já estão lá — o import viraria ruído.
 */
describe("chave (deduplicação do import)", () => {
  it("ignora caixa", () => {
    expect(chave("Tio Adriano")).toBe(chave("TIO ADRIANO"));
  });

  it("ignora acento", () => {
    expect(chave("Tribunal de Justiça")).toBe(chave("Tribunal de Justica"));
  });

  it("ignora pontuação e espaço", () => {
    expect(chave("Santo Beer - Choperia & Restaurante")).toBe(
      chave("Santo Beer Choperia Restaurante"),
    );
  });

  it("distingue coisas realmente diferentes", () => {
    expect(chave("Freelancer")).not.toBe(chave("Freelance Studio"));
  });

  it("aguenta string vazia", () => {
    expect(chave("")).toBe("");
  });
});
