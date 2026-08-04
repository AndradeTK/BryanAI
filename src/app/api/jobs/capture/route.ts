import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { ingestJob, parseJsonLd, parseManual } from "@/server/jobs/ingest";
import { applicationRepo } from "@/server/db/repositories";

export function OPTIONS() {
  return preflight();
}

/**
 * Captura de vaga — usada pela extensão (envia {url, html}) e pela web app
 * (envia {titulo, descricao, empresa}). Parseia via JSON-LD quando há HTML;
 * senão, entrada manual. Cria a candidatura em "saved" para aparecer no kanban.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const body = await request.json();

    let parsed = null;
    if (typeof body.html === "string" && body.html.length > 0) {
      parsed = parseJsonLd(body.html, body.url);
    }
    if (!parsed) {
      if (!body.titulo || !body.descricao) {
        return fail(
          "Vaga sem JSON-LD detectável. Envie título e descrição manualmente.",
        );
      }
      parsed = parseManual({
        titulo: body.titulo,
        descricao: body.descricao,
        empresa: body.empresa,
        localizacao: body.localizacao,
        url: body.url,
      });
    }

    const job = await ingestJob(parsed);

    // Se ainda não há candidatura para esta vaga, cria em "saved".
    const existing = await applicationRepo.getByJob(job.id);
    const application = existing ?? (await applicationRepo.create({ jobId: job.id }));

    return ok({ job, application, deduped: !!existing });
  });
}
