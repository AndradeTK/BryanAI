import Link from "next/link";
import {
  historicoRepo,
  documentRepo,
  applicationRepo,
} from "@/server/db/repositories";
import { deleteHistorico } from "../historico/actions";
import { DocCard } from "./DocCard";
import { Attachments, type JobOption } from "./Attachments";

export const dynamic = "force-dynamic";

/**
 * Documentos: (1) "Meus anexos" — PDFs do usuário (reference letters etc.),
 * com upload, vínculo a vaga e uso pela IA; (2) galeria de currículos GERADOS
 * pelo app (lê do histórico). Os arquivos de ambos vivem no volume `generated`.
 */
export default async function DocumentosPage() {
  const [registros, docs, board] = await Promise.all([
    historicoRepo.getAll(),
    documentRepo.getAll(),
    applicationRepo.getBoard(),
  ]);
  const comArquivo = registros.filter((r) => r.pdfPath && r.status === "concluido");

  const jobOptions: JobOption[] = board.map((b) => ({
    id: b.jobId,
    label: `${b.titulo}${b.empresa ? ` — ${b.empresa}` : ""}`,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Documentos</h1>
      <p className="text-content-subtle mb-6">
        Seus anexos e os currículos gerados. Os arquivos ficam salvos entre
        reinícios.
      </p>

      <Attachments
        jobs={jobOptions}
        rows={docs.map((d) => ({
          id: d.id,
          kind: d.kind,
          title: d.title,
          filename: d.filename,
          hasText: !!d.extractedText,
          textoViaOcr: d.textoViaOcr,
          // Trecho, não o texto inteiro: uma carta longa engordaria o payload
          // RSC de toda a página sem necessidade. Dá para conferir o começo,
          // que é onde erros de transcrição aparecem primeiro.
          amostraTexto: d.extractedText
            ? d.extractedText.slice(0, 1500) +
              (d.extractedText.length > 1500 ? "\n\n[…]" : "")
            : null,
          useForAi: d.useForAi,
          jobId: d.jobId,
          data: d.createdAt?.toLocaleDateString("pt-BR") ?? "",
        }))}
      />

      <h2 className="text-lg font-semibold text-content mb-3">
        Currículos gerados
      </h2>

      {comArquivo.length === 0 ? (
        <p className="text-content-subtle text-sm">
          Nenhum documento gerado ainda.{" "}
          <Link href="/jobfit" className="text-primary-600 hover:underline">
            Gerar um currículo
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comArquivo.map((r) => (
            <DocCard
              key={r.id}
              id={r.id}
              nome={r.pdfPath!}
              vaga={r.vagaTitulo ?? "Currículo"}
              score={r.score}
              data={r.createdAt?.toLocaleDateString("pt-BR") ?? ""}
              deleteAction={deleteHistorico}
            />
          ))}
        </div>
      )}
    </div>
  );
}
