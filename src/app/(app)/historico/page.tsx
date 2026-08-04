import Link from "next/link";
import { historicoRepo } from "@/server/db/repositories";
import { HistoricoRow } from "./HistoricoRow";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const registros = await historicoRepo.getAll();

  const concluidos = registros.filter((r) => r.status === "concluido");
  const scores = concluidos
    .map((r) => r.score)
    .filter((s): s is number => s != null);
  const scoreMedio =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Histórico</h1>
      <p className="text-content-subtle mb-8">
        Todas as análises e currículos gerados, do mais recente ao mais antigo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Stat label="Total de gerações" value={`${registros.length}`} />
        <Stat label="Concluídas" value={`${concluidos.length}`} />
        <Stat label="Score médio" value={scoreMedio != null ? `${scoreMedio}` : "—"} />
      </div>

      <div className="bg-surface rounded-xl border border-line p-6">
        {registros.length === 0 ? (
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
                  <th className="py-2 pr-4">Arquivo</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <HistoricoRow key={r.id} registro={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-6">
      <p className="text-sm text-content-subtle">{label}</p>
      <p className="text-3xl font-bold text-content mt-1">{value}</p>
    </div>
  );
}
