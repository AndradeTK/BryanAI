import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { improve } from "@/server/ai/coverLetter";

export function OPTIONS() {
  return preflight();
}

// Analisa e melhora uma cover letter existente (saída estruturada).
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const { coverLetter, titulo, descricao } = await request.json();
    if (!coverLetter || !titulo || !descricao)
      return fail("Cover letter, título e descrição da vaga são obrigatórios.");

    const result = await improve(coverLetter, { titulo, descricao });
    return ok(result);
  });
}
