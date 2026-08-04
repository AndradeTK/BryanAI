import { ok, fail, preflight, handle, guardPanel } from "@/server/http/api";
import { generateStudyPlan } from "@/server/ai/skillsGap";

export function OPTIONS() {
  return preflight();
}

// Gera um plano de estudos de 12 semanas a partir dos gaps identificados.
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { gaps, horasPorSemana = 10 } = await request.json();
    if (!gaps || (Array.isArray(gaps) && gaps.length === 0))
      return fail("Envie os gaps identificados para gerar o plano.");
    const plano = await generateStudyPlan(gaps, Number(horasPorSemana) || 10);
    return ok(plano);
  });
}
