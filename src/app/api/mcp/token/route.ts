import { trocarCode, renovar } from "@/server/mcp/oauth";

/**
 * Troca de authorization code por token, e renovação.
 *
 * Aceita `application/x-www-form-urlencoded` — o Claude manda assim, e a doc
 * avisa que um endpoint só-JSON responde 415 e o fluxo falha de forma
 * intermitente e difícil de ler.
 *
 * Os erros seguem os códigos do RFC 6749 (`invalid_grant`, não
 * `invalid_request` nem código próprio): o Claude decide entre renovar e
 * pedir novo consentimento a partir desse código. Um código errado aqui
 * significa reautenticação em loop.
 */
export const dynamic = "force-dynamic";

function erro(code: string, status = 400): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("invalid_request");
  }

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : null;
  };

  const grant = str("grant_type");
  const clientId = str("client_id");
  if (!clientId) return erro("invalid_client", 401);

  let resultado;

  if (grant === "authorization_code") {
    const code = str("code");
    const verifier = str("code_verifier");
    const redirectUri = str("redirect_uri");
    if (!code || !verifier || !redirectUri) return erro("invalid_request");
    resultado = await trocarCode({ code, codeVerifier: verifier, redirectUri, clientId });
  } else if (grant === "refresh_token") {
    const refresh = str("refresh_token");
    if (!refresh) return erro("invalid_request");
    resultado = await renovar({ refresh, clientId });
  } else {
    return erro("unsupported_grant_type");
  }

  if ("erro" in resultado) {
    return erro(resultado.erro, resultado.erro === "invalid_client" ? 401 : 400);
  }

  return new Response(
    JSON.stringify({
      access_token: resultado.access,
      token_type: "Bearer",
      expires_in: resultado.expiraEm,
      refresh_token: resultado.refresh,
      scope: "perfil",
    }),
    {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
}
