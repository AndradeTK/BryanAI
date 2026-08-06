import { z } from "zod";
import { ok, handle, guardApi } from "@/server/http/api";
import { prepararEntrevista } from "@/server/ai/entrevista";
import { preflight } from "@/server/http/api";

const BodySchema = z.object({
  titulo: z.string().min(1).max(300),
  descricao: z.string().min(30).max(20000),
  idioma: z.enum(["pt-BR", "en-CA"]).default("pt-BR"),
});

// Prompt grande (perfil inteiro) mais resposta longa.
export const maxDuration = 240;

export function OPTIONS() {
  return preflight();
}

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const { titulo, descricao, idioma } = BodySchema.parse(await request.json());
    const preparo = await prepararEntrevista({ titulo, descricao }, idioma);
    return ok({ preparo });
  });
}
