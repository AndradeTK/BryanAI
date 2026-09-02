import { ISSUER, RESOURCE } from "@/server/mcp/oauth";

/**
 * Protected Resource Metadata (RFC 9728) — onde o Claude descobre qual
 * authorization server usar.
 *
 * O `resource` precisa bater EXATAMENTE com a URL que você digita ao adicionar
 * o conector, path incluso. Divergência aqui quebra a conexão em silêncio.
 *
 * `authorization_servers` é lido só na primeira entrada: a doc é explícita que
 * o Claude não tenta as seguintes.
 */
export function GET() {
  return Response.json(
    {
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      bearer_methods_supported: ["header"],
      scopes_supported: ["perfil"],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
