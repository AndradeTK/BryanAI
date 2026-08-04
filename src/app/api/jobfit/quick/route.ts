import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { getFullResume } from "@/server/resume/curriculoService";
import { quickAnalysis } from "@/server/ai/analyzer";

export function OPTIONS() {
  return preflight();
}

// Análise rápida — usada pela extensão Chrome.
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const { titulo, descricao } = await request.json();
    if (!titulo || !descricao)
      return fail("Título e descrição da vaga são obrigatórios.");
    const curriculo = await getFullResume();
    const analise = await quickAnalysis(curriculo, { titulo, descricao });
    return ok(analise);
  });
}
