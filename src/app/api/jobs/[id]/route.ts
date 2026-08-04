import { ok, fail, preflight, handle, guardApi, parseId } from "@/server/http/api";
import { db } from "@/server/db/client";
import { applicationEvents } from "@/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { jobRepo, toVectorLiteral } from "@/server/db/repositories";

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

    return ok({ events, parecidas });
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
    const { notes, followUpDate } = await request.json();
    await db.execute(sql`
      UPDATE applications
      SET notes = ${typeof notes === "string" ? notes : null},
          follow_up_date = ${followUpDate || null},
          updated_at = now()
      WHERE id = ${appId}
    `);
    return ok({ updated: true });
  });
}
