"use server";

import { requireUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { propostaRepo } from "@/server/db/repositories";
import { aplicarEscrita, ehEscrita } from "@/server/chat/ferramentas";

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
  moverCandidatura: ["/jobs", "/"],
  salvarResposta: ["/aprendizado"],
};

/**
 * Aplica uma proposta que você aprovou.
 *
 * A validação acontece de novo aqui, e não é redundância: a proposta pode ter
 * sido criada dias atrás, por outro canal, e o schema de `ARGS_SCHEMAS` pode
 * ter mudado nesse meio-tempo. Uma proposta que não passa mais no Zod deve
 * falhar na aplicação — é o que impede um argumento obsoleto de virar dado.
 */
export async function aprovarProposta(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return;

  const proposta = await propostaRepo.pegarPendente(id);
  if (!proposta) return; // já resolvida, ou expirou enquanto a tela estava aberta

  if (!ehEscrita(proposta.ferramenta)) {
    await propostaRepo.resolver(id, "rejeitada", "Ferramenta desconhecida.");
    revalidatePath("/propostas");
    return;
  }

  try {
    const mensagem = await aplicarEscrita(
      proposta.ferramenta,
      proposta.argumentos,
    );
    await propostaRepo.resolver(id, "aplicada", mensagem);
    for (const rota of REVALIDAR[proposta.ferramenta] ?? []) revalidatePath(rota);
  } catch (e) {
    // O erro fica gravado na proposta em vez de sumir: é o que explica por que
    // uma alteração aprovada não apareceu.
    await propostaRepo.resolver(
      id,
      "rejeitada",
      e instanceof Error ? e.message : "Falha ao aplicar.",
    );
  }

  revalidatePath("/propostas");
}

export async function rejeitarProposta(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (id) await propostaRepo.resolver(id, "rejeitada");
  revalidatePath("/propostas");
}

/**
 * Rejeita tudo que está pendente.
 *
 * Existe o "rejeitar todas" e NÃO existe o "aprovar todas", e a assimetria é
 * deliberada: rejeitar em massa é seguro — nada é gravado. Aprovar em massa
 * seria assinar embaixo de um lote sem ler, que é exatamente o que a fila
 * existe para impedir.
 */
export async function rejeitarTodas(): Promise<void> {
  await requireUser();

  await propostaRepo.rejeitarTodas();
  revalidatePath("/propostas");
}
