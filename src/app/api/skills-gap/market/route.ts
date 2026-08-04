import { ok, fail, preflight, handle, guardPanel } from "@/server/http/api";
import { getFullResume } from "@/server/resume/curriculoService";
import { compareMarket } from "@/server/ai/skillsGap";

export function OPTIONS() {
  return preflight();
}

// Compara o perfil com as demandas de mercado de uma área.
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { area } = await request.json();
    if (!area) return fail("Informe a área do mercado a comparar.");
    const curriculo = await getFullResume();
    const analise = await compareMarket(curriculo, area);
    return ok(analise);
  });
}
