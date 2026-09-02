import {
  propostaRepo,
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  perfilRepo,
  canadaProfileRepo,
} from "@/server/db/repositories";
import { ROTULO_ESCRITA, ehEscrita } from "@/server/chat/ferramentas";
import { ListaPropostas } from "./ListaPropostas";

export const dynamic = "force-dynamic";

/**
 * Busca o registro que a proposta vai alterar, para o card mostrar o "antes".
 *
 * Sem isso, `Empresa: Acme Corp` sozinho não diz se mudou alguma coisa. Com o
 * valor atual ao lado, `Acme → Acme Corp` decide a aprovação em um olhar — e é
 * o que separa aprovar com atenção de aprovar no automático.
 */
async function valorAtual(
  ferramenta: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const id = typeof args.id === "number" ? args.id : null;

  switch (ferramenta) {
    case "salvarPerfil":
      return (await perfilRepo.get()) as Record<string, unknown> | null;
    case "salvarPerfilCanadense":
      return (await canadaProfileRepo.get()) as Record<string, unknown> | null;
    // As demais só têm "antes" quando alteram um registro existente.
    case "salvarExperiencia":
    case "removerExperiencia":
      return id
        ? ((await experienciaRepo.getById(id)) as Record<string, unknown> | null)
        : null;
    case "salvarFormacao":
    case "removerFormacao":
      return id
        ? ((await formacaoRepo.getById(id)) as Record<string, unknown> | null)
        : null;
    case "salvarCurso":
    case "removerCurso":
      return id
        ? ((await cursoRepo.getById(id)) as Record<string, unknown> | null)
        : null;
    case "salvarIdioma":
    case "removerIdioma":
      return id
        ? ((await idiomaRepo.getById(id)) as Record<string, unknown> | null)
        : null;
    default:
      return null;
  }
}

export default async function PropostasPage() {
  const pendentes = await propostaRepo.listarPendentes();

  const itens = await Promise.all(
    pendentes.map(async (p) => ({
      id: p.id,
      ferramenta: p.ferramenta,
      rotulo: ehEscrita(p.ferramenta)
        ? ROTULO_ESCRITA[p.ferramenta]
        : p.ferramenta,
      argumentos: p.argumentos,
      atual: await valorAtual(p.ferramenta, p.argumentos),
      origem: p.origem === "mcp" ? (p.origemRotulo ?? "Assistente externo") : null,
      quando: p.criadaEm.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Propostas</h1>
      <p className="text-content-subtle mb-6">
        Alterações sugeridas por IA que esperam a sua aprovação. Nada aqui foi
        gravado — revise antes de aplicar.
      </p>

      <ListaPropostas itens={itens} />
    </div>
  );
}
