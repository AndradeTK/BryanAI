import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { hashPassword as hashFromScript } from "../../../scripts/create-user.mjs";

// scrypt com N=2^16 leva ~100ms por chamada — é o ponto do algoritmo. O timeout
// padrão do vitest (5s) não cobre um arquivo inteiro disso.
const TIMEOUT = 30_000;

describe("hashPassword", () => {
  it(
    "produz hash no formato scrypt$N$r$p$salt$hash",
    async () => {
      const hash = await hashPassword("senha-de-teste-123");
      const parts = hash.split("$");
      expect(parts).toHaveLength(6);
      expect(parts[0]).toBe("scrypt");
      expect(Number(parts[1])).toBe(2 ** 16);
    },
    TIMEOUT,
  );

  it(
    "gera hashes diferentes para a mesma senha (salt aleatório)",
    async () => {
      const [a, b] = await Promise.all([
        hashPassword("mesma-senha"),
        hashPassword("mesma-senha"),
      ]);
      expect(a).not.toBe(b);
    },
    TIMEOUT,
  );

  it(
    "nunca embute a senha em claro",
    async () => {
      const hash = await hashPassword("senha-secreta-unica");
      expect(hash).not.toContain("senha-secreta-unica");
    },
    TIMEOUT,
  );
});

describe("verifyPassword", () => {
  it(
    "aceita a senha correta",
    async () => {
      const hash = await hashPassword("senha-correta");
      expect(await verifyPassword("senha-correta", hash)).toBe(true);
    },
    TIMEOUT,
  );

  it(
    "rejeita a senha errada",
    async () => {
      const hash = await hashPassword("senha-correta");
      expect(await verifyPassword("senha-errada", hash)).toBe(false);
    },
    TIMEOUT,
  );

  it(
    "rejeita variações que poderiam passar por normalização frouxa",
    async () => {
      const hash = await hashPassword("Senha");
      expect(await verifyPassword("senha", hash)).toBe(false);
      expect(await verifyPassword("Senha ", hash)).toBe(false);
      expect(await verifyPassword("", hash)).toBe(false);
    },
    TIMEOUT,
  );

  it(
    "trata acento composto e pré-composto como a mesma senha (NFKC)",
    async () => {
      // "senhá" com U+00E1 vs "a" + U+0301. O usuário digita a mesma coisa; o
      // teclado é que decide os bytes.
      const precomposto = "senhá";
      const decomposto = "senhá";
      const hash = await hashPassword(precomposto);
      expect(await verifyPassword(decomposto, hash)).toBe(true);
    },
    TIMEOUT,
  );

  /**
   * O script que cria o usuário roda em produção, onde não há TypeScript, então
   * ele tem a própria cópia do scrypt. Se os parâmetros ou o formato divergirem,
   * a conta é criada com um hash que o login não consegue verificar — e o erro
   * só apareceria na hora de entrar. Este teste amarra os dois.
   */
  it(
    "aceita hash gerado por scripts/create-user.mjs",
    async () => {
      const doScript = await hashFromScript("senha-vinda-do-script");
      expect(await verifyPassword("senha-vinda-do-script", doScript)).toBe(true);
      expect(await verifyPassword("senha-errada", doScript)).toBe(false);
    },
    TIMEOUT,
  );

  it(
    "retorna false — sem lançar — para hash malformado",
    async () => {
      for (const ruim of [
        "",
        "nao-e-um-hash",
        "scrypt$1$2$3",
        "bcrypt$65536$8$1$c2FsdA==$aGFzaA==",
        "scrypt$abc$8$1$c2FsdA==$aGFzaA==",
      ]) {
        expect(await verifyPassword("qualquer", ruim)).toBe(false);
      }
    },
    TIMEOUT,
  );
});
