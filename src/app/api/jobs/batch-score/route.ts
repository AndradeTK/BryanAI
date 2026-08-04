import { z } from "zod";
import { rankJobsByProfile } from "@/server/jobs/matching";
import { scoreJobs } from "@/server/jobs/scoring";
import { requireUser } from "@/server/auth";
import { ok, handle } from "@/server/http/api";

/**
 * Pontua em lote as vagas já salvas no kanban.
 *
 * Não pontua tudo: ordena por similaridade semântica com o perfil e analisa só
 * as top-K. Cada pontuação é uma chamada ao Gemini, e o free tier dá ~10 RPM —
 * varrer o kanban inteiro estouraria a cota antes de terminar. `scoreJobs`
 * enfileira respeitando esse limite.
 *
 * Só sessão de navegador: é uma ação do painel, não da extensão.
 */
const BodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const maxDuration = 300;

export async function POST(request: Request) {
  return handle(async () => {
    await requireUser();

    const raw = await request.json().catch(() => ({}));
    const { limit } = BodySchema.parse(raw ?? {});

    const candidatas = await rankJobsByProfile(limit);
    const resultados = await scoreJobs(candidatas);

    return ok({
      pontuadas: resultados.length,
      resultados,
    });
  });
}
