import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ok, fail, handle, guardPanel } from "@/server/http/api";
import { aplicarEscrita, ehEscrita } from "@/server/chat/ferramentas";

/**
 * Aplica uma alteração que o usuário aprovou na tela.
 *
 * A proposta faz um ida-e-volta pelo navegador entre ser gerada e ser aceita,
 * então o que chega aqui é entrada não confiável — mesmo numa aplicação de um
 * usuário só. O nome da ferramenta é conferido contra a lista permitida e os
 * argumentos são revalidados por Zod dentro de `aplicarEscrita`. Nada é gravado
 * com base na palavra do cliente.
 */
const BodySchema = z.object({
  ferramenta: z.string().min(1),
  argumentos: z.record(z.string(), z.unknown()).default({}),
});

/** Páginas que precisam refletir a mudança na próxima navegação. */
const REVALIDAR: Record<string, string[]> = {
  salvarPerfil: ["/perfil", "/"],
  salvarExperiencia: ["/experiencias", "/"],
  removerExperiencia: ["/experiencias", "/"],
  salvarFormacao: ["/formacao", "/"],
  removerFormacao: ["/formacao", "/"],
  salvarCurso: ["/cursos", "/"],
  removerCurso: ["/cursos", "/"],
  salvarIdioma: ["/idiomas", "/"],
  removerIdioma: ["/idiomas", "/"],
  salvarPerfilCanadense: ["/canada", "/"],
  moverCandidatura: ["/jobs"],
  salvarResposta: ["/aprendizado"],
};

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { ferramenta, argumentos } = BodySchema.parse(await request.json());

    if (!ehEscrita(ferramenta)) {
      return fail(`Operação não permitida: ${ferramenta}`, 400);
    }

    let mensagem: string;
    try {
      mensagem = await aplicarEscrita(ferramenta, argumentos);
    } catch (e) {
      if (e instanceof z.ZodError) {
        const campo = e.issues[0]?.path.join(".") || "dados";
        return fail(`Alteração inválida em "${campo}": ${e.issues[0]?.message}`, 400);
      }
      throw e;
    }

    for (const caminho of REVALIDAR[ferramenta] ?? []) revalidatePath(caminho);
    return ok({ mensagem });
  });
}
