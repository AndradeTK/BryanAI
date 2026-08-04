"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  purgeExpiredSessions,
  SESSION_COOKIE,
} from "@/server/auth/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
} from "@/server/auth/rate-limit";
import { cookies } from "next/headers";

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export interface LoginState {
  error?: string;
}

/**
 * Hash descartável para o caminho de "usuário não existe".
 *
 * Sem isso, um e-mail inexistente responderia na hora e um e-mail real levaria
 * os ~100ms do scrypt — diferença suficiente para enumerar quais contas existem.
 * Aqui os dois caminhos pagam o mesmo custo.
 */
const DUMMY_HASH_PROMISE = hashPassword("placeholder-para-igualar-o-tempo");

function clientIp(h: Headers): string {
  // Atrás do nginx: X-Forwarded-For traz o IP real como primeiro elemento.
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const h = await headers();
  const ip = clientIp(h);
  const buckets = [`email:${email}`, `ip:${ip}`];

  const limit = await checkRateLimit(buckets);
  if (!limit.allowed) {
    const minutos = Math.ceil(limit.retryAfter / 60);
    return {
      error: `Muitas tentativas. Tente de novo em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, await DUMMY_HASH_PROMISE);

  if (!user || !valid) {
    await recordFailedAttempt(buckets);
    // Mensagem única: não revela se o e-mail existe.
    return { error: "E-mail ou senha incorretos." };
  }

  await clearAttempts(buckets);
  await purgeExpiredSessions();

  const { token, expiresAt } = await createSession(user.id, {
    userAgent: h.get("user-agent") ?? undefined,
    ip,
  });
  await setSessionCookie(token, expiresAt);
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  redirect("/");
}

export async function logout() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  await clearSessionCookie();
  redirect("/login");
}
