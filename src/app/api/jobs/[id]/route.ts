import { ok, fail, preflight, handle, guardApi, parseId } from "@/server/http/api";
import { db } from "@/server/db/client";
import { applicationEvents } from "@/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  jobRepo,
  historicoRepo,
  applicationRepo,
  toVectorLiteral,
} from "@/server/db/repositories";

export function OPTIONS() {
  return preflight();
}

/**
 * Detalhe de uma candidatura: timeline de eventos (#10) + vagas parecidas (#13).
 * `id` é o application id.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const appId = parseId((await params).id);

    const events = await db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, appId))
      .orderBy(desc(applicationEvents.id));

    const jobRows = (await db.execute(
      sql`SELECT job_id FROM applications WHERE id = ${appId}`,
    )) as unknown as { job_id: number }[];
    if (!jobRows[0]) return fail("Candidatura não encontrada.", 404);

    const job = await jobRepo.getById(jobRows[0].job_id);
    let parecidas: Array<{ id: number; titulo: string; empresa: string | null }> = [];
    if (job?.embedding) {
      const lit = toVectorLiteral(job.embedding as unknown as number[]);
      const near = await db.execute(sql`
        SELECT id, titulo, empresa
        FROM jobs
        WHERE embedding IS NOT NULL AND id <> ${job.id}
        ORDER BY (embedding::halfvec(3072)) <=> (${lit}::halfvec(3072)) ASC
        LIMIT 3
      `);
      parecidas = near as unknown as typeof parecidas;
    }

    // Currículos já gerados para esta candidatura — responde "qual versão eu
    // mandei para essa vaga?", que é a pergunta da véspera da entrevista.
    const curriculos = (await historicoRepo.porCandidatura(appId))
      .filter((h) => h.pdfPath)
      .map((h) => ({
        id: h.id,
        arquivo: h.pdfPath!,
        score: h.score,
        criadoEm: h.createdAt?.toISOString() ?? null,
      }));

    return ok({ events, parecidas, curriculos });
  });
}

/** Atualiza notas / follow-up (#9). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const appId = parseId((await params).id);
    const body = await request.json();

    /**
     * Só entra no UPDATE o que o cliente realmente mandou.
     *
     * A versão anterior gravava as duas colunas sempre, então um PATCH com
     * apenas `notes` apagava a data de follow-up — o campo ausente virava
     * `null` no SQL. Ausente e vazio são coisas diferentes: ausente é "não
     * mexa", vazio é "limpe".
     */
    const data: { notes?: string | null; followUpDate?: string | null } = {};
    if ("notes" in body) {
      data.notes = typeof body.notes === "string" ? body.notes : null;
    }
    if ("followUpDate" in body) {
      data.followUpDate = body.followUpDate || null;
    }
    if (Object.keys(data).length === 0) {
      return fail("Nada para atualizar.");
    }

    const row = await applicationRepo.updateDetails(appId, data);
    if (!row) return fail("Candidatura não encontrada.", 404);
    return ok({ updated: true });
  });
}

/**
 * Exclui uma candidatura. Diferente de arquivar, que é só uma coluna do
 * kanban: aqui a linha some, junto com a timeline de eventos.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const appId = parseId((await params).id);
    await applicationRepo.remove(appId);
    return ok({ deleted: true });
  });
}
