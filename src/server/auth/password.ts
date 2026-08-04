import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt do node:crypto, sem dependência externa.
 *
 * A alternativa natural seria argon2, mas ela é um módulo nativo: teria que ser
 * compilada, e o build acontece no runner do GitHub Actions enquanto o binário
 * roda numa VPS Ubuntu 22.04 com outra glibc. scrypt já está no Node, é uma KDF
 * de memória-dura reconhecida, e some com essa classe inteira de problema.
 *
 * N=2^16 com r=8 usa ~64MB por hash. É deliberadamente caro: acontece uma vez
 * por login numa aplicação de um usuário só, e é o que torna um ataque de
 * dicionário sobre o hash inviável.
 */
const PARAMS = { N: 2 ** 16, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Verifica a senha em tempo constante. Retorna false para qualquer hash
 * malformado em vez de lançar — quem chama não deve distinguir "hash corrompido"
 * de "senha errada".
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
    const params = {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
      maxmem: PARAMS.maxmem,
    };
    if (!Number.isInteger(params.N) || !Number.isInteger(params.r)) return false;

    const expected = Buffer.from(hashB64, "base64");
    const actual = await scryptAsync(
      password.normalize("NFKC"),
      Buffer.from(saltB64, "base64"),
      expected.length,
      params,
    );
    // timingSafeEqual exige comprimentos iguais — já garantido acima.
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
