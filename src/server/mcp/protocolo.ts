import { PROTOCOL_VERSION } from "./contrato";

/**
 * JSON-RPC da spec MCP 2026-07-28, sem I/O.
 *
 * Separado do route handler porque é a peça que não se vê falhar num
 * navegador: um header que não bate devolve 400 e o Claude some sem dizer por
 * quê. Aqui dá para testar cada regra com Vitest.
 *
 * A revisão 2026-07-28 é stateless — sem `initialize`, sem sessão, sem SSE
 * obrigatório. Sobram três métodos.
 */

export interface Requisicao {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    _meta?: Record<string, unknown>;
  };
}

export interface Resposta {
  status: number;
  corpo: unknown;
}

/** Códigos que a spec reserva. */
export const ERRO = {
  METODO_DESCONHECIDO: -32601,
  PARAMS_INVALIDOS: -32602,
  HEADER_MISMATCH: -32020,
  VERSAO_NAO_SUPORTADA: -32022,
} as const;

function erro(
  id: string | number | null | undefined,
  code: number,
  message: string,
  status: number,
  data?: unknown,
): Resposta {
  return {
    status,
    corpo: {
      jsonrpc: "2.0",
      id: id ?? null,
      error: data === undefined ? { code, message } : { code, message, data },
    },
  };
}

function ok(id: string | number | null | undefined, result: object): Resposta {
  return {
    status: 200,
    corpo: { jsonrpc: "2.0", id: id ?? null, result },
  };
}

/**
 * O `Mcp-Name` pode vir codificado quando o valor não cabe num header ASCII.
 * O formato é `=?base64?VALOR?=`, e comparar sem decodificar rejeitaria
 * requisições válidas.
 */
export function decodificarValorHeader(v: string): string {
  const m = v.match(/^=\?base64\?(.*)\?=$/);
  if (!m) return v;
  try {
    return Buffer.from(m[1], "base64").toString("utf8");
  } catch {
    return v;
  }
}

/**
 * Confere que os headers batem com o corpo.
 *
 * Não é burocracia: existe porque um proxy pode rotear pelo header enquanto o
 * servidor executa pelo corpo. Se os dois divergem, alguém está sendo enganado
 * — e a spec manda rejeitar com 400 e -32020.
 */
export function validarHeaders(
  req: Requisicao,
  headers: {
    protocolVersion: string | null;
    method: string | null;
    name: string | null;
  },
): Resposta | null {
  const id = req.id;

  if (!headers.protocolVersion) {
    return erro(id, ERRO.HEADER_MISMATCH, "Falta o header MCP-Protocol-Version.", 400);
  }

  const versaoNoCorpo = req.params?._meta?.[
    "io.modelcontextprotocol/protocolVersion"
  ] as string | undefined;
  if (versaoNoCorpo && versaoNoCorpo !== headers.protocolVersion) {
    return erro(
      id,
      ERRO.HEADER_MISMATCH,
      `MCP-Protocol-Version (${headers.protocolVersion}) não bate com o _meta do corpo (${versaoNoCorpo}).`,
      400,
    );
  }

  if (headers.protocolVersion !== PROTOCOL_VERSION) {
    return erro(
      id,
      ERRO.VERSAO_NAO_SUPORTADA,
      "Versão de protocolo não suportada.",
      400,
      { supported: [PROTOCOL_VERSION], requested: headers.protocolVersion },
    );
  }

  if (!headers.method) {
    return erro(id, ERRO.HEADER_MISMATCH, "Falta o header Mcp-Method.", 400);
  }
  if (headers.method !== req.method) {
    return erro(
      id,
      ERRO.HEADER_MISMATCH,
      `Mcp-Method (${headers.method}) não bate com o método do corpo (${req.method}).`,
      400,
    );
  }

  // Mcp-Name só é exigido em tools/call.
  if (req.method === "tools/call") {
    if (!headers.name) {
      return erro(id, ERRO.HEADER_MISMATCH, "Falta o header Mcp-Name.", 400);
    }
    if (decodificarValorHeader(headers.name) !== req.params?.name) {
      return erro(
        id,
        ERRO.HEADER_MISMATCH,
        "Mcp-Name não bate com params.name.",
        400,
      );
    }
  }

  return null;
}

export function respostaDiscover(
  id: string | number | null | undefined,
  serverInfo: { name: string; version: string },
  instructions: string,
): Resposta {
  return ok(id, {
    resultType: "complete",
    supportedVersions: [PROTOCOL_VERSION],
    capabilities: { tools: {} },
    _meta: { "io.modelcontextprotocol/serverInfo": serverInfo },
    instructions,
  });
}

export function respostaToolsList(
  id: string | number | null | undefined,
  tools: unknown[],
): Resposta {
  return ok(id, { resultType: "complete", tools });
}

/**
 * Resultado de uma tool.
 *
 * `isError: true` faz o cliente entregar o texto ao modelo para ele se
 * corrigir e tentar de novo — é o que se quer num argumento inválido. Para
 * "proposta criada" o certo é sucesso: é estado terminal, e um erro faria o
 * modelo insistir numa ação que já deu certo.
 */
export function respostaTool(
  id: string | number | null | undefined,
  texto: string,
  isError = false,
): Resposta {
  return ok(id, {
    resultType: "complete",
    content: [{ type: "text", text: texto }],
    isError,
  });
}

export function respostaMetodoDesconhecido(
  id: string | number | null | undefined,
  metodo: string | undefined,
): Resposta {
  return erro(
    id,
    ERRO.METODO_DESCONHECIDO,
    `Método desconhecido: ${metodo ?? "(vazio)"}`,
    404,
  );
}

export function respostaParamsInvalidos(
  id: string | number | null | undefined,
  mensagem: string,
): Resposta {
  return erro(id, ERRO.PARAMS_INVALIDOS, mensagem, 200);
}
