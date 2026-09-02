import { ISSUER } from "@/server/mcp/oauth";

/**
 * Authorization Server Metadata (RFC 8414).
 *
 * As duas flags que importam: `client_id_metadata_document_supported` e o
 * "none" em `token_endpoint_auth_methods_supported`. O Claude só escolhe CIMD
 * quando as DUAS estão presentes — faltando qualquer uma, ele cai em Dynamic
 * Client Registration, e aí precisaríamos de um /register e de uma tabela de
 * clientes que este desenho evita.
 */
export function GET() {
  return Response.json(
    {
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/api/mcp/authorize`,
      token_endpoint: `${ISSUER}/api/mcp/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      // Obrigatório anunciar: o Claude sempre manda PKCE S256.
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      client_id_metadata_document_supported: true,
      scopes_supported: ["perfil"],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
