import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { redirectPermitido, verificarPkce } from "./oauth";

describe("redirectPermitido", () => {
  it("aceita o callback dos apps hospedados do Claude", () => {
    expect(redirectPermitido("https://claude.ai/api/mcp/auth_callback")).toBe(true);
  });

  /**
   * O Claude Code é cliente nativo e escuta numa porta efêmera, diferente a
   * cada sessão. A RFC 8252 §7.3 exige comparar ignorando a porta — comparar
   * a URL inteira quebraria a conexão toda vez que ele reiniciasse.
   */
  it("aceita loopback em qualquer porta", () => {
    expect(redirectPermitido("http://localhost:3118/callback")).toBe(true);
    expect(redirectPermitido("http://localhost:51234/callback")).toBe(true);
    expect(redirectPermitido("http://127.0.0.1:8080/callback")).toBe(true);
  });

  it("recusa destino que não é nosso", () => {
    expect(redirectPermitido("https://evil.example/callback")).toBe(false);
    expect(redirectPermitido("https://claude.ai.evil.com/api/mcp/auth_callback")).toBe(false);
    // Caminho diferente no loopback também não serve.
    expect(redirectPermitido("http://localhost:3000/roubar")).toBe(false);
    expect(redirectPermitido("nao-e-url")).toBe(false);
  });

  it("recusa loopback em https — o Claude Code usa http", () => {
    expect(redirectPermitido("https://localhost:3118/callback")).toBe(false);
  });
});

describe("verificarPkce", () => {
  /**
   * Sem PKCE, um authorization code interceptado é trocado por token por quem
   * o interceptou. O verifier prova que quem troca é quem iniciou.
   */
  it("aceita o verifier que gerou o challenge", () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    expect(verificarPkce(verifier, challenge)).toBe(true);
  });

  it("recusa verifier errado", () => {
    const challenge = createHash("sha256").update("certo").digest("base64url");
    expect(verificarPkce("errado", challenge)).toBe(false);
  });

  it("recusa challenge vazio", () => {
    expect(verificarPkce("qualquer", "")).toBe(false);
  });
});
