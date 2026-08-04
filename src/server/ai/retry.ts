/**
 * Retry com exponential backoff para chamadas à IA.
 * Portado da Fase 1 (config/ai.js) para TypeScript.
 * Repete apenas erros transitórios: 429, 5xx, timeout/rede.
 */

interface MaybeHttpError {
  status?: number;
  response?: { status?: number };
  message?: string;
}

export function isRetryable(error: unknown): boolean {
  const e = error as MaybeHttpError;
  const status = e?.status ?? e?.response?.status;
  if (status === 429 || status === 500 || status === 503) return true;
  const msg = String(e?.message ?? "");
  return /429|Resource exhausted|ETIMEDOUT|ECONNRESET|fetch failed/i.test(msg);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt === maxRetries) throw error;
      const wait = baseDelay * 2 ** attempt + Math.random() * 1000;
      const msg = (error as MaybeHttpError)?.message ?? "erro desconhecido";
      console.warn(
        `[AI] Erro transitório na tentativa ${attempt + 1}/${maxRetries + 1}. ` +
          `Aguardando ${Math.round(wait)}ms antes de repetir... (${msg})`,
      );
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  // Inalcançável: o loop sempre retorna ou lança.
  throw new Error("withRetry: estado inalcançável");
}
