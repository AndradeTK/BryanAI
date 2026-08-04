import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { answerRepo } from "@/server/db/repositories";
import { normalizeQuestion } from "@/server/apply/answers";

export function OPTIONS() {
  return preflight();
}

/** Lista as respostas aprendidas. */
export async function GET() {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    return ok({ answers: await answerRepo.getAll() });
  });
}

/**
 * Salva/atualiza uma resposta aprendida (o usuário preencheu um `needs_input`).
 * Body: `{ label, answer, key? }` — a `key` é derivada do label se não vier.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
    if (!label || !answer) return fail("Envie `label` e `answer`.");

    const key =
      typeof body?.key === "string" && body.key.trim()
        ? body.key.trim()
        : normalizeQuestion(label);
    if (!key) return fail("Não foi possível derivar a chave da pergunta.");

    const saved = await answerRepo.upsert(key, label, answer);
    return ok({ answer: saved });
  });
}
