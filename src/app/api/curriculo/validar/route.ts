import { ok, preflight, handle, guardPanel } from "@/server/http/api";
import { validateResume } from "@/server/resume/curriculoService";

export function OPTIONS() {
  return preflight();
}

// Health check + validação do currículo — usado pela extensão para saber se o
// servidor está no ar e se o perfil está completo.
export async function GET() {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const validacao = await validateResume();
    return ok(validacao);
  });
}
