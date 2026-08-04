import { ok, fail, preflight, handle, guardPanel } from "@/server/http/api";
import { generateText, MODELS } from "@/server/ai/client";
import { getFullResume } from "@/server/resume/curriculoService";
import { perfilRepo } from "@/server/db/repositories";

export function OPTIONS() {
  return preflight();
}

/**
 * Gera ou otimiza o resumo profissional do perfil (#2). Se já há um resumo,
 * melhora-o; senão, escreve um do zero a partir das experiências e formação.
 * NÃO salva automaticamente — devolve a sugestão para o usuário revisar.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const salvar = body.salvar === true;

    const cv = await getFullResume();
    if (!cv.perfil) return fail("Cadastre seu perfil primeiro.");

    const resumoAtual = cv.perfil.resumo_base?.trim();
    const experiencias = (cv.experiencias ?? [])
      .map((e) => `- ${e.cargo} @ ${e.empresa}: ${e.descricao_atividades ?? ""}`)
      .join("\n")
      .slice(0, 3000);
    const formacao = (cv.formacao ?? [])
      .map((f) => `${f.titulo_curso} (${f.instituicao_projeto})`)
      .join("; ");

    const prompt = resumoAtual
      ? `Você é um copywriter de currículos. Melhore o resumo profissional abaixo:
mais impactante, conciso (3-4 linhas), voz ativa, sem clichês. Mantenha os fatos.

RESUMO ATUAL:
${resumoAtual}

CONTEXTO (experiências/formação, para embasar):
${experiencias}
${formacao}

Retorne APENAS o resumo melhorado, sem comentários.`
      : `Você é um copywriter de currículos. Escreva um resumo profissional (3-4
linhas, voz ativa, impactante, sem clichês) para este candidato, a partir das
experiências e formação. Não invente números.

EXPERIÊNCIAS:
${experiencias}

FORMAÇÃO: ${formacao}

Retorne APENAS o resumo, sem comentários.`;

    const resumo = await generateText({
      model: MODELS.fast,
      prompt,
      maxOutputTokens: 512,
    });

    if (salvar) {
      await perfilRepo.upsert({
        nomeCompleto: cv.perfil.nome_completo ?? "",
        email: cv.perfil.email ?? null,
        telefone: cv.perfil.telefone ?? null,
        localizacao: cv.perfil.localizacao ?? null,
        linkedin: cv.perfil.linkedin ?? null,
        github: cv.perfil.github ?? null,
        resumoBase: resumo,
      });
    }

    return ok({ resumo, salvo: salvar });
  });
}
