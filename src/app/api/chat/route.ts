import { z } from "zod";
import { ok, handle, guardPanel } from "@/server/http/api";
import { conversar, type Mensagem } from "@/server/chat/agente";

/**
 * Turno de conversa do assistente.
 *
 * Só sessão do painel: a extensão não tem nada a fazer aqui, e este endpoint
 * pode ler o perfil inteiro.
 */
const BodySchema = z.object({
  mensagem: z.string().min(1).max(4000),
  // O histórico vem do cliente porque a conversa não é persistida. Limitado
  // para o prompt não crescer sem teto ao longo de uma sessão longa.
  historico: z
    .array(
      z.object({
        papel: z.enum(["user", "model"]),
        texto: z.string().max(8000),
      }),
    )
    .max(40)
    .default([]),
});

// Leituras encadeadas mais a resposta do modelo passam de 60s no pior caso.
export const maxDuration = 180;

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { mensagem, historico } = BodySchema.parse(await request.json());
    const resposta = await conversar(historico as Mensagem[], mensagem);
    return ok(resposta);
  });
}
