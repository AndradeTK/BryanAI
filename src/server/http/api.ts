import { headers } from "next/headers";
import { env, isProd } from "@/lib/env";
import { authenticateApi, getCurrentUser } from "@/server/auth";

/**
 * Helpers dos route handlers: shape `{ success, data|error }` que a extensão e o
 * front esperam, mais o CORS.
 *
 * O CORS aqui é uma allowlist, não `*`. A versão anterior liberava qualquer
 * origem sob o argumento de ser ferramenta pessoal em localhost — o que deixou
 * de valer no momento em que isso passou a responder num domínio público: com
 * `*`, qualquer página aberta no navegador podia chamar a API e ler o currículo,
 * o histórico de candidaturas e gastar a cota do Gemini. A proteção real é o
 * token exigido por `authenticateApi()`; esta lista é a segunda camada.
 */

/** Domínios onde a extensão injeta content script (ver chrome-extension/manifest.json). */
const JOB_BOARD_HOSTS = [
  "linkedin.com",
  "indeed.ca",
  "indeed.com",
  "jobbank.gc.ca",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "myworkdayjobs.com",
  "glassdoor.ca",
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  // O próprio painel.
  if (origin === env.APP_URL) return true;

  // O popup da extensão. O ID só existe depois de instalada, e não dá para
  // fixá-lo aqui; quem autoriza de fato nessas rotas é o Bearer token.
  if (origin.startsWith("chrome-extension://")) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:" && hostname !== "localhost") return false;
    return JOB_BOARD_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

async function corsHeaders(): Promise<Record<string, string>> {
  const origin = (await headers()).get("origin") ?? "";
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    // A resposta muda conforme o Origin — sem isso um cache intermediário pode
    // devolver o cabeçalho de uma origem para outra.
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    base["Access-Control-Allow-Origin"] = origin;
  }
  return base;
}

export async function ok(data: unknown, status = 200): Promise<Response> {
  return Response.json(
    { success: true, data },
    { status, headers: await corsHeaders() },
  );
}

export async function fail(error: string, status = 400): Promise<Response> {
  return Response.json(
    { success: false, error },
    { status, headers: await corsHeaders() },
  );
}

/** Resposta ao preflight CORS. */
export async function preflight(): Promise<Response> {
  return new Response(null, { status: 204, headers: await corsHeaders() });
}

/**
 * Guard das rotas que a extensão consome: aceita a sessão do painel ou o Bearer
 * token. Devolve a resposta de erro quando barra, ou null quando libera:
 *
 *   const denied = await guardApi();
 *   if (denied) return denied;
 */
export async function guardApi(): Promise<Response | null> {
  const auth = await authenticateApi();
  if (auth.ok) return null;
  return fail(auth.error, auth.status);
}

/**
 * Guard das rotas que só o painel usa. Não aceita o token da extensão — coisas
 * como exportar o banco inteiro ou reescrever o perfil não são operações que a
 * extensão precise fazer, e o token dela circula em mais lugares que o cookie.
 */
export async function guardPanel(): Promise<Response | null> {
  const user = await getCurrentUser();
  if (user) return null;
  return fail("Não autorizado.", 401);
}

/**
 * Erro cuja mensagem PODE ser mostrada ao usuário: validação, regra de negócio,
 * limite de cota. Qualquer outra exceção é tratada como interna.
 */
export class ErroDeUso extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ErroDeUso";
  }
}

/**
 * Envolve um handler traduzindo exceções para `{ success:false }`.
 *
 * Em produção a mensagem de um erro inesperado NÃO vai para o cliente: um erro
 * do driver do Postgres traz a query inteira, com nomes de tabela e coluna. O
 * detalhe vai para o log do servidor; o cliente recebe uma mensagem genérica.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    // redirect() e notFound() sinalizam via exceção — precisam subir intactos.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest: unknown }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw e;
    }

    if (e instanceof ErroDeUso) {
      return fail(e.message, e.status);
    }

    console.error("[API]", e);
    return fail(
      isProd
        ? "Erro interno. Tente novamente."
        : e instanceof Error
          ? e.message
          : "Erro interno.",
      500,
    );
  }
}

/**
 * Converte um parâmetro de rota em id numérico. Sem isso, `Number("abc")` vira
 * NaN e chega até o banco, onde o erro do driver devolve a query na resposta.
 *
 * Exige dígitos decimais e nada mais. `Number()` sozinho seria frouxo demais
 * para algo vindo da URL: aceita `0x10` como 16, `1e3` como 1000 e `" 1 "` como
 * 1 — todos formatos que nenhum link legítimo do sistema produz.
 */
export function parseId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new ErroDeUso("Identificador inválido.", 400);
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ErroDeUso("Identificador inválido.", 400);
  }
  return id;
}
