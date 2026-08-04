import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { getFullResume } from "@/server/resume/curriculoService";
import { generate } from "@/server/ai/coverLetter";

export function OPTIONS() {
  return preflight();
}

// Gera cover letter — usada pela página e pela extensão.
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const { titulo, descricao, empresa, idioma = "pt-BR", tom = "formal" } =
      await request.json();
    if (!titulo || !descricao)
      return fail("Título e descrição da vaga são obrigatórios.");

    const curriculo = await getFullResume();
    const result = await generate(
      curriculo,
      { titulo, descricao, empresa },
      idioma,
      tom,
    );
    return ok(result);
  });
}
