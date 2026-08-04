import { renderResumeHtml } from "@/server/pdf/render";
import { getFullResume } from "@/server/resume/curriculoService";
import { guardPanel } from "@/server/http/api";
import type { ResumeTemplateProps } from "@/components/resume-templates";

/**
 * Serve o HTML puro de um template com os dados reais do perfil (dados brutos,
 * não otimizados pela IA — é a pré-visualização do modelo). Usado nos iframes de
 * comparação (/preview) e no card de documentos. É o MESMO HTML do PDF.
 *
 * Renderiza o currículo inteiro, então exige sessão como qualquer página.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const denied = await guardPanel();
  if (denied) return denied;

  const { templateId } = await params;
  const cv = await getFullResume();

  const props: ResumeTemplateProps = {
    perfil: cv.perfil ?? undefined,
    curriculo: {
      resumo_profissional: cv.perfil?.resumo_base ?? undefined,
      experiencias: cv.experiencias?.map((e) => ({
        cargo: e.cargo as string,
        empresa: e.empresa as string,
        periodo: (e as { periodo?: string }).periodo ?? "",
        bullets: [],
      })),
      habilidades_tecnicas: { principais: [], secundarias: [] },
    },
    formacao: cv.formacao as ResumeTemplateProps["formacao"],
    projetos: cv.projetos as ResumeTemplateProps["projetos"],
    cursos: cv.cursos as ResumeTemplateProps["cursos"],
    idiomas: cv.idiomas as ResumeTemplateProps["idiomas"],
    lang: "pt-BR",
  };

  const html = await renderResumeHtml(templateId, props);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
