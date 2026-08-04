/**
 * fetch com timeout via AbortController.
 * As chamadas de IA podem levar dezenas de segundos (retry + backoff no
 * servidor); sem timeout o usuário não distingue "processando" de "travado".
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 45000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "A operação demorou demais e foi cancelada. Tente novamente.",
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
