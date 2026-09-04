import { describe, it, expect } from "vitest";
import {
  validarHeaders,
  decodificarValorHeader,
  respostaTool,
  respostaDiscover,
  ERRO,
  type Requisicao,
} from "./protocolo";
import { PROTOCOL_VERSION, listarTools, TOOLS } from "./contrato";

const metaOk = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
};

function headers(over: Partial<Record<string, string | null>> = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    method: "tools/list",
    name: null,
    ...over,
  };
}

describe("validarHeaders", () => {
  it("aceita uma requisição bem formada", () => {
    const req: Requisicao = {
      id: 1,
      method: "tools/list",
      params: { _meta: metaOk },
    };
    expect(validarHeaders(req, headers())).toBeNull();
  });

  it("recusa sem MCP-Protocol-Version", () => {
    const req: Requisicao = { id: 1, method: "tools/list" };
    const r = validarHeaders(req, headers({ protocolVersion: null }));
    expect(r?.status).toBe(400);
  });

  /**
   * A regra existe porque um proxy pode rotear pelo header enquanto o servidor
   * executa pelo corpo. Divergência significa que alguém está sendo enganado.
   */
  it("recusa quando o header e o corpo discordam da versão", () => {
    const req: Requisicao = {
      id: 1,
      method: "tools/list",
      params: {
        _meta: { "io.modelcontextprotocol/protocolVersion": "2025-11-25" },
      },
    };
    const r = validarHeaders(req, headers());
    expect(r?.status).toBe(400);
    expect((r?.corpo as { error: { code: number } }).error.code).toBe(
      ERRO.HEADER_MISMATCH,
    );
  });

  it("recusa quando Mcp-Method não bate com o método do corpo", () => {
    const req: Requisicao = {
      id: 1,
      method: "tools/call",
      params: { name: "x", _meta: metaOk },
    };
    const r = validarHeaders(req, headers({ method: "tools/list" }));
    expect((r?.corpo as { error: { code: number } }).error.code).toBe(
      ERRO.HEADER_MISMATCH,
    );
  });

  it("devolve as versões suportadas quando a pedida é outra", () => {
    const req: Requisicao = { id: 1, method: "tools/list" };
    const r = validarHeaders(req, headers({ protocolVersion: "1900-01-01" }));
    const corpo = r?.corpo as {
      error: { code: number; data: { supported: string[] } };
    };
    expect(corpo.error.code).toBe(ERRO.VERSAO_NAO_SUPORTADA);
    expect(corpo.error.data.supported).toContain(PROTOCOL_VERSION);
  });

  it("exige Mcp-Name em tools/call, e que ele bata", () => {
    const req: Requisicao = {
      id: 1,
      method: "tools/call",
      params: { name: "bryanai_profile_read", _meta: metaOk },
    };
    expect(
      validarHeaders(req, headers({ method: "tools/call", name: null }))?.status,
    ).toBe(400);
    expect(
      validarHeaders(req, headers({ method: "tools/call", name: "outra" }))
        ?.status,
    ).toBe(400);
    expect(
      validarHeaders(
        req,
        headers({ method: "tools/call", name: "bryanai_profile_read" }),
      ),
    ).toBeNull();
  });

  /** Nome que não cabe em ASCII vem como =?base64?...?= — comparar cru rejeitaria. */
  it("decodifica o Mcp-Name em base64 antes de comparar", () => {
    const nome = "bryanai_profile_read";
    const codificado = `=?base64?${Buffer.from(nome).toString("base64")}?=`;
    expect(decodificarValorHeader(codificado)).toBe(nome);

    const req: Requisicao = {
      id: 1,
      method: "tools/call",
      params: { name: nome, _meta: metaOk },
    };
    expect(
      validarHeaders(req, headers({ method: "tools/call", name: codificado })),
    ).toBeNull();
  });
});

describe("respostas", () => {
  /**
   * isError=true faz o cliente entregar o texto ao modelo para ele se corrigir
   * e tentar de novo. "Proposta criada" é estado terminal: marcar como erro
   * faria o modelo insistir numa ação que já deu certo.
   */
  it("marca sucesso por padrão", () => {
    const r = respostaTool(1, "Proposta #3 criada.");
    expect((r.corpo as { result: { isError: boolean } }).result.isError).toBe(
      false,
    );
  });

  it("o discover anuncia a versão e a capacidade de tools", () => {
    const r = respostaDiscover(1, { name: "x", version: "1" }, "instruções");
    const result = (r.corpo as { result: Record<string, unknown> }).result;
    expect(result.supportedVersions).toEqual([PROTOCOL_VERSION]);
    expect(result.capabilities).toHaveProperty("tools");
    expect(result.resultType).toBe("complete");
  });
});

describe("contrato", () => {
  it("toda tool tem nome válido para a spec", () => {
    for (const t of listarTools()) {
      expect(t.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema).toHaveProperty("type", "object");
    }
  });

  it("a ordem é determinística — a spec pede, e o cliente cacheia", () => {
    expect(listarTools().map((t) => t.name)).toEqual(
      listarTools().map((t) => t.name),
    );
    const nomes = listarTools().map((t) => t.name);
    expect(nomes).toEqual([...nomes].sort());
  });

  it("leitura é readOnly e escrita não é", () => {
    for (const t of listarTools()) {
      const interna = TOOLS[t.name];
      expect(t.annotations.readOnlyHint).toBe(interna.tipo === "leitura");
    }
  });

  /**
   * O aviso existe porque, sem ele, o modelo recebe "proposta criada",
   * interpreta como sucesso parcial e chama a ferramenta de novo.
   */
  it("tudo que não é leitura avisa que não grava", () => {
    for (const t of listarTools()) {
      if (TOOLS[t.name].tipo === "leitura") continue;
      expect(t.description).toContain("NÃO grava");
    }
  });

  /**
   * O import cria várias propostas numa chamada só, então é escrita para todas
   * as travas — escopo, limite por hora, teto de pendentes. Se um dia ele for
   * marcado como readOnly por engano, passaria por cima de todas elas.
   */
  it("o import não é readOnly", () => {
    const imp = listarTools().find((t) => t.name === "bryanai_profile_import");
    expect(imp).toBeDefined();
    expect(imp!.annotations.readOnlyHint).toBe(false);
    expect(imp!.inputSchema).toHaveProperty("required", ["texto"]);
  });

  it("o v1 não expõe nenhuma remoção", () => {
    for (const nome of Object.keys(TOOLS)) {
      expect(nome).not.toMatch(/delete|remove/i);
    }
  });
});
