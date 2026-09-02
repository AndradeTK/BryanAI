import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { publicTokenRepo } from "@/server/db/repositories";
import { criarCode, redirectPermitido, limparCodesVencidos } from "@/server/mcp/oauth";

/**
 * Tela de consentimento do OAuth.
 *
 * É a exceção da exceção: `/api/mcp` dispensa sessão porque autentica por
 * token, mas esta rota EXIGE sessão de painel. Se ela respondesse sem login,
 * qualquer um consentiria pelo seu servidor — o "confused deputy" clássico.
 *
 * Não usa `requireUser()` porque aquele redireciona para /login sem preservar
 * para onde voltar, e aqui perder os parâmetros do OAuth aborta o fluxo.
 */
export const dynamic = "force-dynamic";

function erroHtml(mensagem: string, status = 400): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Autorização</title>
     <body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">
     <h1 style="font-size:1.25rem">Não foi possível autorizar</h1>
     <p style="color:#555">${mensagem}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p = url.searchParams;

  const clientId = p.get("client_id");
  const redirectUri = p.get("redirect_uri");
  const state = p.get("state");
  const challenge = p.get("code_challenge");
  const metodo = p.get("code_challenge_method");

  if (!clientId || !redirectUri || !challenge) {
    return erroHtml("Faltam parâmetros obrigatórios do OAuth.");
  }
  if (metodo !== "S256") {
    return erroHtml("Só aceitamos PKCE com S256.");
  }
  if (!redirectPermitido(redirectUri)) {
    // Nunca redirecionar para um destino não reconhecido: seria um open
    // redirect que entrega o code a quem pediu.
    return erroHtml("Endereço de retorno não reconhecido.");
  }

  const user = await getCurrentUser();
  if (!user) {
    // Volta para cá depois do login, com os parâmetros intactos.
    redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }

  // Veste o consentimento com um token de perfil. Usa o mais recente que
  // permita propor; se não houver, o usuário precisa criar um em /settings.
  const tokens = await publicTokenRepo.list();
  const token = tokens[0];
  if (!token) {
    return erroHtml(
      'Nenhum link de perfil existe ainda. Crie um em Configurações → "Links do perfil" antes de conectar.',
      409,
    );
  }

  limparCodesVencidos().catch(() => {});

  const code = await criarCode({
    clientId,
    redirectUri,
    codeChallenge: challenge,
    tokenId: token.id,
  });

  const destino = new URL(redirectUri);
  destino.searchParams.set("code", code);
  if (state) destino.searchParams.set("state", state);

  /**
   * Confirmação explícita, com o HOST do client_id à vista.
   *
   * O nome que um cliente declara sobre si mesmo não é verificado por
   * ninguém; o host de onde o client_id é servido, sim. Mostrar o host é o
   * que permite reconhecer um pedido que não veio de quem diz ter vindo.
   */
  const host = (() => {
    try {
      return new URL(clientId).host;
    } catch {
      return clientId;
    }
  })();

  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Autorizar acesso</title>
     <body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5">
       <h1 style="font-size:1.25rem;margin-bottom:.5rem">Conectar ao BryanAI</h1>
       <p style="color:#555"><strong>${host}</strong> quer ler seu perfil e propor alterações.</p>
       <p style="color:#555;font-size:.9rem">Propor não é gravar: toda alteração fica pendente até você aprovar em
       <code>/propostas</code>.</p>
       <p style="margin-top:1.5rem">
         <a href="${destino.toString()}"
            style="display:inline-block;background:#212226;color:#fff;padding:.6rem 1.2rem;border-radius:999px;text-decoration:none">
           Autorizar
         </a>
         <a href="/" style="margin-left:1rem;color:#555">Cancelar</a>
       </p>
     </body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
