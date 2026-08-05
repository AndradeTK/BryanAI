import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "./Markdown";

// createElement em vez de JSX: assim o teste roda sem configurar transformação
// de JSX no vitest, que hoje só compila TypeScript.
const render = (texto: string) =>
  renderToStaticMarkup(createElement(Markdown, { texto }));

describe("Markdown", () => {
  it("converte negrito, itálico e código", () => {
    const html = render("Trabalhou na **Santo Beer** com *atendimento* e `POS`.");
    expect(html).toContain("<strong");
    expect(html).toContain("Santo Beer");
    expect(html).toContain("<em>atendimento</em>");
    expect(html).toContain("<code");
  });

  it("monta lista com marcador", () => {
    const html = render("Faltam:\n- Testes automatizados\n- Experiência canadense");
    expect(html).toContain("<ul");
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
  });

  it("monta lista numerada", () => {
    const html = render("1. Freelancer\n2. TJSP");
    expect(html).toContain("<ol");
    expect(html).toContain("list-decimal");
  });

  it("separa parágrafos em linha em branco", () => {
    const html = render("Primeiro.\n\nSegundo.");
    expect((html.match(/<p /g) ?? []).length).toBe(2);
  });

  /**
   * O texto vem de um modelo. A renderização constrói elementos React em vez de
   * injetar HTML — marcação estranha tem que aparecer como texto, nunca virar
   * markup.
   */
  it("não injeta HTML vindo do texto", () => {
    const html = render('Cuidado <img src=x onerror="alert(1)"> e <script>x</script>');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img");
  });

  it("aguenta texto vazio sem quebrar", () => {
    expect(render("")).toBe("");
    expect(render("   \n\n  ")).toBe("");
  });
});
