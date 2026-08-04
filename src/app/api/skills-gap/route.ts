import { ok, fail, preflight, handle, guardPanel } from "@/server/http/api";
import { getFullResume } from "@/server/resume/curriculoService";
import { analyze } from "@/server/ai/skillsGap";

export function OPTIONS() {
  return preflight();
}

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { titulo, descricao, nivel } = await request.json();
    if (!titulo) return fail("Título do cargo/vaga alvo é obrigatório.");
    const curriculo = await getFullResume();
    const analise = await analyze(curriculo, { titulo, descricao, nivel });
    return ok(analise);
  });
}
