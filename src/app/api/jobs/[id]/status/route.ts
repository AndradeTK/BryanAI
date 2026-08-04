import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { applicationRepo } from "@/server/db/repositories";

const VALID = ["saved", "applied", "interview", "offer", "rejected", "archived"] as const;
type Status = (typeof VALID)[number];

export function OPTIONS() {
  return preflight();
}

/** Muda o status de uma candidatura (mover card no kanban). Grava evento. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const { id } = await params;
    const { status } = await request.json();
    if (!VALID.includes(status as Status)) {
      return fail(`Status inválido. Use: ${VALID.join(", ")}.`);
    }
    const row = await applicationRepo.updateStatus(Number(id), status as Status);
    if (!row) return fail("Candidatura não encontrada.", 404);
    return ok(row);
  });
}
