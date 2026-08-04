import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { loginAttempts } from "@/server/db/schema";

/**
 * Trava de força bruta no login.
 *
 * Janela deslizante de 15 minutos, 5 tentativas. A contagem é por identificador
 * (e-mail tentado e IP são registrados separadamente), então nem inundar de
 * e-mails diferentes vindos do mesmo IP nem martelar um e-mail a partir de IPs
 * variados escapam da trava.
 *
 * Vive no banco de propósito: um balde em memória zeraria a cada deploy e a
 * cada restart do PM2, o que é justamente quando um atacante ganharia fôlego.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos até liberar, quando bloqueado. */
  retryAfter: number;
}

export async function checkRateLimit(
  identifiers: string[],
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS);

  for (const identifier of identifiers) {
    const [row] = await db
      .select({
        n: sql<number>`count(*)::int`,
        oldest: sql<Date | null>`min(${loginAttempts.attemptedAt})`,
      })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          gte(loginAttempts.attemptedAt, since),
        ),
      );

    if (row && row.n >= MAX_ATTEMPTS) {
      const oldest = row.oldest ? new Date(row.oldest).getTime() : Date.now();
      const retryAfter = Math.max(
        1,
        Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000),
      );
      return { allowed: false, retryAfter };
    }
  }

  return { allowed: true, retryAfter: 0 };
}

export async function recordFailedAttempt(identifiers: string[]): Promise<void> {
  const rows = identifiers.filter(Boolean).map((identifier) => ({ identifier }));
  if (rows.length) await db.insert(loginAttempts).values(rows);
}

/** Login bem-sucedido zera o balde daquele usuário/IP. */
export async function clearAttempts(identifiers: string[]): Promise<void> {
  for (const identifier of identifiers) {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, identifier));
  }
}
