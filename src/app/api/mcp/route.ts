import { createHash } from "node:crypto";
import { publicTokenRepo, propostaRepo } from "@/server/db/repositories";
import {
  LEITURAS,
  ARGS_SCHEMAS,
  ROTULO_ESCRITA,
} from "@/server/chat/ferramentas";
import { TOOLS, listarTools, SERVER_INFO } from "@/server/mcp/contrato";
import {
  validarHeaders,
  respostaDiscover,
  respostaToolsList,
  respostaTool,
  respostaMetodoDesconhecido,
  respostaParamsInvalidos,
  type Requisicao,
  type Resposta,
} from "@/server/mcp/protocolo";

/**
 * Servidor MCP: o BryanAI como ferramenta de um chat de IA externo.
 *
 * Leitura executa direto. Escrita NÃO grava — cria uma proposta pendente, que
 * você confirma em /propostas.
 *
 * A trava não é zelo abstrato. Você cola descrição de vaga na conversa; é
 * texto de terceiro, e pode carregar instrução injetada. Do outro lado há
 * ferramentas capazes de reescrever o perfil. Com a proposta no meio, uma
 * injeção bem-sucedida produz no máximo lixo numa fila de revisão — nunca
 * dado gravado. É o "separar decisão de execução" da OWASP LLM06, no nível do
 * código e não da instrução.
 *
 * O invariante: este arquivo NUNCA chama aplicarEscrita(). Ela continua
 * alcançável só por caminhos com sessão de painel.
 */

export const dynamic = "force-dynamic";

/** Teto de propostas pendentes. Um modelo em loop enche a fila; um humano não. */
const MAX_PENDENTES = 20;

function json(r: Resposta): Response {
  return new Response(JSON.stringify(r.corpo), {
    status: r.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Autentica pelo mesmo token de `public_profile_tokens`, com hash SHA-256.
 *
 * O 401 precisa ser de transporte, não um 200 com isError: um 200 faz o
 * cliente entregar o texto ao modelo e seguir, sem oferecer reconexão.
 */
async function autenticar(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  return publicTokenRepo.findValid(hash);
}

function naoAutorizado(): Response {
  return new Response(
    JSON.stringify({ error: "Token inválido ou ausente." }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="bryanai"',
      },
    },
  );
}

export async function POST(request: Request) {
  // Anti DNS-rebinding: a spec manda 403 quando a origem existe e não confere.
  // O Claude chama de servidor para servidor, sem Origin — daí só validar
  // quando o header vem.
  const origin = request.headers.get("origin");
  if (origin && !origin.startsWith("https://claude.ai")) {
    return new Response(null, { status: 403 });
  }

  const token = await autenticar(request);
  if (!token) return naoAutorizado();

  let req: Requisicao;
  try {
    req = await request.json();
  } catch {
    return json(respostaParamsInvalidos(null, "Corpo não é JSON válido."));
  }

  const erroHeader = validarHeaders(req, {
    protocolVersion: request.headers.get("mcp-protocol-version"),
    method: request.headers.get("mcp-method"),
    name: request.headers.get("mcp-name"),
  });
  if (erroHeader) return json(erroHeader);

  publicTokenRepo.registrarUso(token.id).catch(() => {});

  switch (req.method) {
    case "server/discover":
      return json(
        respostaDiscover(
          req.id,
          SERVER_INFO,
          "Perfil profissional e acadêmico de Bryan. As ferramentas de leitura respondem na hora; as de escrita NÃO gravam — criam uma proposta que ele confirma no aplicativo.",
        ),
      );

    case "tools/list":
      return json(respostaToolsList(req.id, listarTools()));

    case "tools/call": {
      const nome = req.params?.name;
      if (!nome || !(nome in TOOLS)) {
        return json(respostaMetodoDesconhecido(req.id, nome));
      }
      const tool = TOOLS[nome];

      if (tool.tipo === "leitura") {
        const dados = await LEITURAS[tool.interna]();
        return json(respostaTool(req.id, JSON.stringify(dados, null, 1)));
      }

      // ---- Escrita: vira proposta, nunca grava ----
      const pendentes = await propostaRepo.contarPendentes();
      if (pendentes >= MAX_PENDENTES) {
        return json(
          respostaTool(
            req.id,
            `Fila cheia: ${pendentes} propostas aguardam decisão. Bryan precisa revisar as existentes em ${process.env.APP_URL ?? "app.bryanandrade.dev"}/propostas antes que novas sejam aceitas.`,
            true,
          ),
        );
      }

      const parsed = ARGS_SCHEMAS[tool.interna].safeParse(
        req.params?.arguments ?? {},
      );
      if (!parsed.success) {
        // Erro de argumento é o caso onde isError=true serve: o modelo lê a
        // mensagem e corrige a chamada.
        return json(
          respostaTool(
            req.id,
            `Argumentos inválidos: ${parsed.error.issues.map((i) => `${i.path.join(".")} — ${i.message}`).join("; ")}`,
            true,
          ),
        );
      }

      const proposta = await propostaRepo.criar({
        ferramenta: tool.interna,
        argumentos: parsed.data as Record<string, unknown>,
        origem: "mcp",
        origemRotulo: token.label ?? "Assistente externo",
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return json(
        respostaTool(
          req.id,
          `Proposta #${proposta.id} criada e pendente de confirmação: "${ROTULO_ESCRITA[tool.interna]}". Nada foi gravado. Bryan precisa aprovar em ${process.env.APP_URL ?? "https://app.bryanandrade.dev"}/propostas. Avise a ele e siga a conversa — não chame esta ferramenta de novo para a mesma alteração.`,
        ),
      );
    }

    default:
      return json(respostaMetodoDesconhecido(req.id, req.method));
  }
}

/** A revisão 2026-07-28 não usa GET nem DELETE no endpoint. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export const DELETE = GET;
