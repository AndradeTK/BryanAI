import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { getFullResume } from "@/server/resume/curriculoService";
import { analyzeJobFit } from "@/server/ai/analyzer";
import { rewriteResume } from "@/server/ai/writer";
import { renderResumePdf, renderResumeDocx } from "@/server/pdf/render";
import { generateFilename, saveGenerated } from "@/server/pdf/storage";
import { historicoRepo, settingsRepo } from "@/server/db/repositories";
import type { SectionName } from "@/components/resume-templates";

export function OPTIONS() {
  return preflight();
}

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const body = await request.json();
    const { titulo, descricao, formato = "pdf" } = body;
    // Vincula à candidatura quando a geração parte do kanban. Null na geração
    // avulsa pela tela de Job Fit — nem toda análise nasce de uma vaga salva.
    const applicationId =
      typeof body.applicationId === "number" && body.applicationId > 0
        ? body.applicationId
        : null;
    // Settings do usuário como default quando o request não especifica.
    const settings = await settingsRepo.get();
    const idioma = body.idioma || settings.idiomaDefault || "pt-BR";
    const templateId =
      body.templateId || body.template || settings.templatePadrao || "minimalista";
    if (!titulo || !descricao)
      return fail("Título e descrição da vaga são obrigatórios.");

    const hist = await historicoRepo.create({
      vagaTitulo: titulo,
      status: "processando",
      applicationId,
    });

    try {
      const curriculo = await getFullResume();
      const analise = await analyzeJobFit(curriculo, { titulo, descricao });
      const otimizado = await rewriteResume(
        curriculo,
        { titulo, descricao },
        analise,
        idioma,
      );

      // Os bullets vêm como objetos (text + metric_grounded). Anti-alucinação:
      // quando a métrica NÃO é fundamentada, o bullet vai LIMPO para o PDF
      // (documento entregável) e o marcador é coletado numa lista separada
      // "métricas a preencher", devolvida na resposta para o usuário quantificar.
      const metricasAPreencher: Array<{
        experiencia: string;
        bullet: string;
        sugestao: string;
      }> = [];

      const prefs = settings.preferencias;
      const isCanadian = idioma.startsWith("en-CA") || idioma.startsWith("fr-CA");
      const canada = curriculo.canada;

      // Contato canadense: em CV en-CA/fr-CA, troca o endereço/telefone BR pelos
      // campos canadenses quando existem (evita sinalizar "fora do país").
      const perfilBase = curriculo.perfil ?? undefined;
      const perfil =
        perfilBase && isCanadian
          ? {
              ...perfilBase,
              localizacao: canada?.canadian_city ?? perfilBase.localizacao,
              telefone: canada?.canadian_phone ?? perfilBase.telefone,
              // Preferências de contato do usuário.
              github: prefs.mostrarGithub ? perfilBase.github : undefined,
              portfolio: prefs.mostrarPortfolio
                ? (perfilBase as { portfolio?: string }).portfolio
                : undefined,
            }
          : perfilBase && {
              ...perfilBase,
              github: prefs.mostrarGithub ? perfilBase.github : undefined,
              portfolio: prefs.mostrarPortfolio
                ? (perfilBase as { portfolio?: string }).portfolio
                : undefined,
            };

      // Links são dados factuais do banco (a IA não os gera). Mescla por título.
      const cursoLinks = new Map(
        (curriculo.cursos ?? []).map((c) => [
          (c as { titulo_do_curso?: string }).titulo_do_curso,
          (c as { link?: string }).link,
        ]),
      );
      const projetoLinks = new Map(
        (curriculo.projetos ?? []).map((p) => [
          (p as { instituicao_projeto?: string }).instituicao_projeto,
          (p as { link?: string }).link,
        ]),
      );

      // Certificações limitadas pela preferência; projetos omitidos se desligado.
      const cursos = otimizado.cursos_certificacoes
        .slice(0, prefs.limiteCertificacoes || 6)
        .map((c) => ({ ...c, link: cursoLinks.get(c.titulo_do_curso) ?? undefined }));
      const projetos = prefs.incluirProjetos
        ? otimizado.projetos.map((p) => ({
            ...p,
            link: p.link ?? projetoLinks.get(p.instituicao_projeto) ?? undefined,
          }))
        : [];

      const props = {
        perfil: perfil ?? undefined,
        curriculo: {
          titulo_profissional: otimizado.titulo_profissional,
          resumo_profissional: otimizado.resumo_profissional,
          experiencias: otimizado.experiencias.map((e) => ({
            ...e,
            bullets: e.bullets.map((b) => {
              if (!b.metric_grounded && b.metric_placeholder) {
                metricasAPreencher.push({
                  experiencia: e.cargo,
                  bullet: b.text,
                  sugestao: b.metric_placeholder,
                });
              }
              return b.text; // PDF sempre recebe o bullet limpo
            }),
          })),
          habilidades_tecnicas: otimizado.habilidades_tecnicas,
        },
        formacao: otimizado.formacao,
        projetos,
        cursos,
        idiomas: otimizado.idiomas,
        lang: idioma,
        // Ordem de seções configurada em /settings (os templates já aceitam).
        sectionsOrder: settings.sectionsOrder as SectionName[],
      };

      const nome = curriculo.perfil?.nome_completo?.split(" ")[0] || "CV";
      const filename = generateFilename(`CV_${nome}`, formato === "docx" ? "docx" : "pdf");
      const result =
        formato === "docx"
          ? await renderResumeDocx(templateId, props)
          : await renderResumePdf(templateId, props);
      await saveGenerated(filename, result.buffer);

      await historicoRepo.markComplete(
        hist.id,
        analise.score,
        filename,
        JSON.stringify(otimizado.keywords_otimizadas),
      );

      return ok({
        historicoId: hist.id,
        score: analise.score,
        analise,
        arquivo: { nome: filename, formato },
        metricas_a_preencher: metricasAPreencher,
      });
    } catch (e) {
      await historicoRepo.markFailed(hist.id);
      throw e;
    }
  });
}
