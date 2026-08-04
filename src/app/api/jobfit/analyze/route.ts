import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { getFullResume } from "@/server/resume/curriculoService";
import { analyzeJobFit } from "@/server/ai/analyzer";
import { historicoRepo } from "@/server/db/repositories";

export function OPTIONS() {
  return preflight();
}

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const { titulo, descricao } = await request.json();
    if (!titulo || !descricao)
      return fail("Título e descrição da vaga são obrigatórios.");

    const hist = await historicoRepo.create({
      vagaTitulo: titulo,
      status: "processando",
    });

    try {
      const curriculo = await getFullResume();
      const analise = await analyzeJobFit(curriculo, { titulo, descricao });
      await historicoRepo.update(hist.id, {
        score: analise.score,
        keywordsFocadas: JSON.stringify(analise.keywords_match),
        status: "concluido",
      });
      return ok({ historicoId: hist.id, analise });
    } catch (e) {
      await historicoRepo.markFailed(hist.id);
      throw e;
    }
  });
}
