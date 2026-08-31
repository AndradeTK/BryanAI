import { createHash } from "node:crypto";
import { publicTokenRepo } from "@/server/db/repositories";
import { perfilEmMarkdown } from "@/server/resume/perfilPublico";

/**
 * Leitura do perfil por token, para colar numa IA de terceiro.
 *
 * É a ÚNICA rota do sistema que responde sem sessão do painel — daí o cuidado:
 *
 * - Exige token válido. Sem token, 401; com token errado, a mesma 401 e a mesma
 *   mensagem, para não dizer a um curioso se um link já existiu.
 * - O banco guarda só o SHA-256 do token (padrão da tabela `sessions`), então
 *   um dump não entrega os links ativos.
 * - Contato redigido por padrão. O link serve para a IA ler o histórico
 *   profissional; telefone e e-mail só saem se o token foi criado com contato
 *   liberado, de propósito.
 * - `noindex` no cabeçalho: mesmo que a URL vaze, buscador não indexa.
 * - Sem `Access-Control-Allow-Origin`: dá para buscar no servidor ou colar no
 *   navegador, mas não para um site de terceiro ler via fetch.
 *
 * Aceita o token por `Authorization: Bearer` (preferido) ou `?token=` — a query
 * string aparece em log de proxy e histórico do navegador, mas é a única forma
 * de colar a URL numa IA que só aceita link.
 */
export const dynamic = "force-dynamic";

function naoAutorizado(): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Token inválido ou ausente." }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const header = request.headers.get("authorization");
  const token =
    header?.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : (url.searchParams.get("token") ?? "");

  if (!token) return naoAutorizado();

  const hash = createHash("sha256").update(token).digest("hex");
  const registro = await publicTokenRepo.findValid(hash);
  if (!registro) return naoAutorizado();

  // Best-effort: falha ao contabilizar não pode derrubar a leitura.
  publicTokenRepo.registrarUso(registro.id).catch(() => {});

  const markdown = await perfilEmMarkdown({
    redactContact: registro.redactContact,
  });

  const comum = {
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
  };

  if (url.searchParams.get("format") === "json") {
    return new Response(JSON.stringify({ markdown }), {
      headers: { ...comum, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  return new Response(markdown, {
    headers: { ...comum, "Content-Type": "text/markdown; charset=utf-8" },
  });
}
