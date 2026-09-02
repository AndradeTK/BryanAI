import { randomBytes, createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { oauthCodes, oauthTokens, publicProfileTokens } from "@/server/db/schema";
import { env } from "@/lib/env";

/**
 * Authorization server OAuth 2.1, no mínimo que o conector do Claude exige.
 *
 * Existe porque o app não aceita header fixo: "Add custom connector" só
 * oferece OAuth, e `static_headers` é beta liberado a poucas organizações. O
 * Bearer da Fase 2 continua valendo para o Claude Code.
 *
 * Só o hash fica no banco, como em `sessions` — um dump não entrega credencial
 * viva.
 */

export const ISSUER = env.APP_URL;
export const RESOURCE = `${env.APP_URL}/api/mcp`;

const ACCESS_TTL_MS = 60 * 60 * 1000; // 1h
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const CODE_TTL_MS = 60 * 1000;

function hash(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

function novoSegredo(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Confere o redirect_uri contra o que cada cliente do Claude usa.
 *
 * O Claude Code é cliente nativo e escuta numa porta efêmera — a porta muda a
 * cada sessão, então a comparação IGNORA a porta (RFC 8252 §7.3 exige isso
 * para 127.0.0.1, e o Claude Code declara localhost também). Comparar a URL
 * inteira quebraria a conexão a cada nova sessão.
 */
export function redirectPermitido(uri: string): boolean {
  if (uri === "https://claude.ai/api/mcp/auth_callback") return true;
  try {
    const u = new URL(uri);
    const loopback = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return loopback && u.protocol === "http:" && u.pathname === "/callback";
  } catch {
    return false;
  }
}

/** PKCE S256: o verifier do cliente tem que gerar o challenge guardado. */
export function verificarPkce(verifier: string, challenge: string): boolean {
  const calculado = createHash("sha256").update(verifier).digest("base64url");
  return calculado === challenge;
}

export async function criarCode(dados: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  tokenId: number;
}): Promise<string> {
  const code = novoSegredo();
  await db.insert(oauthCodes).values({
    codeHash: hash(code),
    clientId: dados.clientId,
    redirectUri: dados.redirectUri,
    codeChallenge: dados.codeChallenge,
    tokenId: dados.tokenId,
    expiraEm: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

/**
 * Troca o code por tokens. O code é de uso único: apagado ao ser consumido,
 * mesmo que a troca falhe depois — um code reapresentado é sinal de ataque,
 * não de retry legítimo.
 */
export async function trocarCode(dados: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<{ access: string; refresh: string; expiraEm: number } | { erro: string }> {
  const h = hash(dados.code);
  const [linha] = await db.select().from(oauthCodes).where(eq(oauthCodes.codeHash, h));
  await db.delete(oauthCodes).where(eq(oauthCodes.codeHash, h));

  if (!linha) return { erro: "invalid_grant" };
  if (linha.expiraEm.getTime() < Date.now()) return { erro: "invalid_grant" };
  if (linha.redirectUri !== dados.redirectUri) return { erro: "invalid_grant" };
  if (linha.clientId !== dados.clientId) return { erro: "invalid_client" };
  if (!verificarPkce(dados.codeVerifier, linha.codeChallenge)) {
    return { erro: "invalid_grant" };
  }
  if (!linha.tokenId) return { erro: "invalid_grant" };

  return emitir(linha.clientId, linha.tokenId);
}

async function emitir(clientId: string, tokenId: number) {
  const access = novoSegredo();
  const refresh = novoSegredo();
  await db.insert(oauthTokens).values({
    accessHash: hash(access),
    refreshHash: hash(refresh),
    clientId,
    tokenId,
    expiraEm: new Date(Date.now() + ACCESS_TTL_MS),
  });
  return { access, refresh, expiraEm: ACCESS_TTL_MS / 1000 };
}

/**
 * Renova com rotação: o refresh antigo morre na mesma operação que emite o
 * novo. A spec exige para cliente público, e é o que limita o estrago de um
 * refresh vazado — o legítimo e o roubado não podem coexistir.
 */
export async function renovar(dados: {
  refresh: string;
  clientId: string;
}): Promise<{ access: string; refresh: string; expiraEm: number } | { erro: string }> {
  const h = hash(dados.refresh);
  const [linha] = await db.select().from(oauthTokens).where(eq(oauthTokens.refreshHash, h));
  if (!linha) return { erro: "invalid_grant" };
  if (linha.criadoEm.getTime() + REFRESH_TTL_MS < Date.now()) {
    await db.delete(oauthTokens).where(eq(oauthTokens.id, linha.id));
    return { erro: "invalid_grant" };
  }
  if (linha.clientId !== dados.clientId) return { erro: "invalid_client" };
  if (!linha.tokenId) return { erro: "invalid_grant" };

  await db.delete(oauthTokens).where(eq(oauthTokens.id, linha.id));
  return emitir(linha.clientId, linha.tokenId);
}

/** Resolve um access token para o token de perfil que ele veste. */
export async function resolverAccess(access: string) {
  const h = hash(access);
  const [linha] = await db
    .select({
      id: oauthTokens.id,
      tokenId: oauthTokens.tokenId,
      expiraEm: oauthTokens.expiraEm,
    })
    .from(oauthTokens)
    .where(eq(oauthTokens.accessHash, h));

  if (!linha || linha.expiraEm.getTime() < Date.now() || !linha.tokenId) return null;

  db.update(oauthTokens)
    .set({ ultimoUso: new Date() })
    .where(eq(oauthTokens.id, linha.id))
    .catch(() => {});

  const [perfil] = await db
    .select()
    .from(publicProfileTokens)
    .where(eq(publicProfileTokens.id, linha.tokenId));
  return perfil ?? null;
}

/** Limpa codes vencidos de carona nas escritas — sem cron. */
export function limparCodesVencidos() {
  return db.delete(oauthCodes).where(sql`${oauthCodes.expiraEm} < now()`);
}
