import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { chave } from "@/server/perfil/importarTexto";
import { listarTools } from "@/server/mcp/contrato";

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

/**
 * O teto de entrada existe desde que o import passou a receber página inteira
 * de LinkedIn, e não só PDF exportado. O que se trava aqui não é o número — é
 * que o corte seja ANUNCIADO: se o texto passa do teto e a mensagem diz só
 * "3 itens novos", quem lê conclui que o perfil tinha 3 itens novos, quando o
 * que houve foi o fim do texto não ter sido lido.
 */
describe("teto de entrada do import", () => {
  const fonte = readFileSync(
    new URL("../perfil/importarTexto.ts", import.meta.url),
    "utf8",
  );

  it("corta pelo teto, e não por um número solto no prompt", () => {
    expect(fonte).toContain("texto.slice(0, MAX_ENTRADA)");
    expect(fonte).not.toMatch(/slice\(0,\s*\d{4,}\)/);
  });

  it("todo retorno avisa quando o texto foi cortado", () => {
    // Só as atribuições dentro de return — não o campo da interface.
    const retornos = fonte.match(/mensagem:\s*(`|ignoradas >)[\s\S]*?,\n/g) ?? [];
    expect(retornos.length).toBe(2);
    for (const r of retornos) expect(r).toContain("${aviso}");
  });
});

/**
 * Uma página de LinkedIn traz perfis de OUTRAS pessoas — "pessoas que você
 * talvez conheça", "perfis semelhantes", quem comentou. O PDF exportado nunca
 * trazia, então nem o prompt nem a descrição precisavam falar disso.
 *
 * O estrago é assimétrico: item seu que ficou de fora você adiciona, mas item
 * de terceiro que entrou como seu você só descobre se reparar. Daí a instrução
 * mandar descartar na dúvida — e daí travar aqui, porque some sem quebrar nada.
 */
describe("perfis de terceiros na página", () => {
  it("o prompt manda extrair só o dono do perfil", () => {
    const fonte = readFileSync(
      new URL("../perfil/importarTexto.ts", import.meta.url),
      "utf8",
    );
    expect(fonte).toMatch(/talvez conhe/i);
    expect(fonte).toMatch(/na d[úu]vida.*descarte/is);
  });

  it("a descrição da tool avisa antes de o modelo ler a página", () => {
    const d = listarTools().find((t) => t.name === "bryanai_profile_import")!
      .description;
    expect(d).toMatch(/talvez conhe/i);
  });
});
