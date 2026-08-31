import Link from "next/link";
import { validateResume } from "@/server/resume/curriculoService";
import { historicoRepo } from "@/server/db/repositories";

export const dynamic = "force-dynamic"; // sempre lê o banco

export default async function DashboardPage() {
  // Os totais vêm de uma agregação no banco, não da lista dos 10 recentes que
  // alimenta a tabela abaixo — senão o "total" seria no máximo 10.
  const [validacao, recentes, totais] = await Promise.all([
    validateResume(),
    historicoRepo.getRecent(10),
    historicoRepo.counts(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Dashboard</h1>
      <p className="text-content-subtle mb-8">
        Visão geral do seu currículo e gerações recentes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Score Médio"
          value={totais.scoreMedio != null ? `${totais.scoreMedio}` : "—"}
          hint={`de ${totais.analises} análise${totais.analises === 1 ? "" : "s"}`}
        />
        {/* Análise e geração gravam na mesma tabela; só a geração produz
            arquivo. Contá-las juntas como "currículos gerados" inflava o
            número — hoje são 6 análises e nenhum currículo. */}
        <StatCard
          label="Currículos Gerados"
          value={`${totais.curriculos}`}
          hint={totais.curriculos === 0 ? "nenhum ainda" : "com arquivo salvo"}
        />
        <StatCard
          label="Completude do Perfil"
          value={`${validacao.completude}%`}
          hint={validacao.valido ? "pronto para gerar" : "precisa de atenção"}
        />
      </div>

      {validacao.issues.length > 0 && (
        <div className="bg-surface rounded-xl border border-line p-6 mb-8">
          <h2 className="text-lg font-semibold text-content mb-3">
            Complete seu currículo
          </h2>
          <ul className="space-y-2">
            {validacao.issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    issue.criticidade === "alta"
                      ? "bg-red-500"
                      : issue.criticidade === "media"
                        ? "bg-yellow-500"
                        : "bg-surface-3"
                  }`}
                />
                <span className="text-content-muted">{issue.mensagem}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-line p-6">
        <h2 className="text-lg font-semibold text-content mb-4">
          Gerações Recentes
        </h2>
        {recentes.length === 0 ? (
          <p className="text-content-subtle text-sm">
            Nenhuma geração ainda.{" "}
            <Link href="/jobfit" className="text-primary-600 hover:underline">
              Analise uma vaga
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-content-subtle border-b border-line">
                  <th className="py-2 pr-4">Vaga</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 sr-only">Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="py-2 pr-4 text-content">{r.vagaTitulo}</td>
                    <td className="py-2 pr-4">{r.score ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2 pr-4 text-content-subtle">
                      {r.createdAt?.toLocaleDateString("pt-BR")}
                    </td>
                    {/* A tabela listava a geração sem dar como chegar nela: o
                        PDF só aparecia navegando até Documentos. */}
                    <td className="py-2 text-right whitespace-nowrap">
                      {r.status === "concluido" && r.pdfPath ? (
                        <>
                          <a
                            href={`/api/arquivos/${r.pdfPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-600 hover:underline"
                          >
                            ver
                          </a>
                          <a
                            href={`/api/arquivos/${r.pdfPath}?download=true`}
                            className="ml-3 text-content-muted hover:underline"
                          >
                            baixar
                          </a>
                        </>
                      ) : (
                        <span className="text-content-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-line p-6">
      <p className="text-sm text-content-subtle">{label}</p>
      <p className="text-3xl font-bold text-content mt-1">{value}</p>
      <p className="text-xs text-content-subtle mt-1">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    concluido: "bg-green-100 text-green-700",
    falha: "bg-red-100 text-red-700",
    processando: "bg-yellow-100 text-yellow-700",
  };
  const cls = map[status ?? ""] ?? "bg-surface-3 text-content-muted";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status ?? "—"}
    </span>
  );
}
