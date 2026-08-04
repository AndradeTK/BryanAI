import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro de borda: barra o tráfego sem cookie de sessão antes de chegar ao
 * React. Roda no runtime Edge, onde não há conexão com o Postgres — então ele
 * verifica apenas a PRESENÇA do cookie, nunca se ele é válido.
 *
 * Isso não é autorização. Um cookie forjado passa daqui. Quem decide de fato é
 * `requireUser()` em (app)/layout.tsx e no topo de cada Server Action, e
 * `authenticateApi()` nas rotas consumidas pela extensão — todos consultando o
 * banco. O middleware existe só para evitar renderizar e consultar à toa.
 */
const SESSION_COOKIE = "bryanai_session";

/** Rotas que respondem sem sessão de navegador. */
const PUBLIC_PATHS = ["/login"];

/**
 * As rotas da extensão autenticam por Bearer token, não por cookie, e por isso
 * não podem ser redirecionadas para /login — devolvem JSON 401 se o token
 * estiver errado. A checagem real está em authenticateApi().
 */
const BEARER_API_PREFIXES = ["/api/jobs", "/api/jobfit", "/api/cover-letter", "/api/answers", "/api/apply"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (BEARER_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  // Rotas de API sem cookie: 401 em JSON. Um fetch não deve receber um HTML de
  // login com status 200 e tentar interpretá-lo como resposta.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Não autorizado." },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Tudo, menos os assets estáticos e o favicon. `_next/static` e `_next/image`
   * são servidos sem passar por aqui para não pagar o custo em cada arquivo.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
