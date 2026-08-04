import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt, and, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions, users, type User } from "@/server/db/schema";
import { isProd } from "@/lib/env";

export const SESSION_COOKIE = "bryanai_session";

/** 30 dias. Renovada quando passa da metade — ver `validateSession`. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = SESSION_TTL_MS / 2;

/** O cookie guarda este valor; o banco guarda só o SHA-256 dele. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: number,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 500),
    ip: meta.ip?.slice(0, 45),
  });

  return { token, expiresAt };
}

/**
 * Resolve o token para o usuário, ou null. Sessão expirada é apagada em vez de
 * só ignorada, para a tabela não virar um cemitério.
 */
export async function validateSession(token: string): Promise<User | null> {
  const tokenHash = hashToken(token);

  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  // Sessão deslizante: só grava quando já passou da metade da validade, para não
  // fazer um UPDATE a cada request.
  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining < RENEW_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  return row.user;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Logout de todos os dispositivos. */
export async function destroyAllSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Faxina de sessões vencidas; chamada no login (barato e oportuno). */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

// ---------- cookie ----------

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // fora do alcance de qualquer JS na página
    secure: isProd, // em dev o host é http://localhost
    sameSite: "lax", // navegação normal envia; POST cross-site não
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
