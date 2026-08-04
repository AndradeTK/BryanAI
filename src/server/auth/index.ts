import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { env } from "@/lib/env";
import type { User } from "@/server/db/schema";
import { SESSION_COOKIE, validateSession } from "./session";

/**
 * Usuário da request atual, ou null.
 *
 * `cache()` do React deduplica dentro de uma mesma request: o layout, a página e
 * cada Server Action podem chamar à vontade que o SELECT acontece uma vez só.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSession(token);
});

/**
 * Exige sessão válida. Esta é a checagem que vale — o middleware só olha se o
 * cookie existe, sem consultar o banco, e por isso não é autorização de
 * verdade. Toda página e Server Action que lê ou escreve dados chama aqui.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Comparação de tokens em tempo constante, tolerante a comprimentos diferentes.
 * `timingSafeEqual` lança quando os buffers têm tamanhos distintos, e o próprio
 * lançar já vaza o comprimento — daí a normalização antes.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compara contra si mesmo para gastar tempo semelhante e devolve false.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export type ApiAuth =
  | { ok: true; via: "session" | "extension" }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Autenticação das rotas de API consumidas pela extensão Chrome.
 *
 * Aceita duas credenciais: a sessão do navegador (quando a chamada vem do
 * próprio painel) ou o token da extensão em `Authorization: Bearer`. Sem
 * EXTENSION_API_TOKEN configurado, responde 503 em vez de liberar — o modo
 * degradado tem que ser fechado, não aberto.
 */
export async function authenticateApi(): Promise<ApiAuth> {
  const user = await getCurrentUser();
  if (user) return { ok: true, via: "session" };

  const expected = env.EXTENSION_API_TOKEN;
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "EXTENSION_API_TOKEN não configurado no servidor.",
    };
  }

  const auth = (await headers()).get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (provided && safeEqual(provided, expected)) {
    return { ok: true, via: "extension" };
  }

  return { ok: false, status: 401, error: "Não autorizado." };
}
