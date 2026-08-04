import { renderResumeHtml } from "@/server/pdf/render";
import { getFullResume } from "@/server/resume/curriculoService";
import type { ResumeTemplateProps } from "@/components/resume-templates";

export const dynamic = "force-dynamic";

/**
 * Preview do currículo — renderiza o MESMO HTML que vai para o PDF
 * (renderResumeHtml), provando que preview e PDF nunca divergem.
 * Mostra os dados reais do banco (não os otimizados pela IA — isto é só o preview
 * do template com os dados brutos).
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const cv = await getFullResume();

  const props: ResumeTemplateProps = {
    perfil: cv.perfil ?? undefined,
    curriculo: {
      resumo_profissional: cv.perfil?.resumo_base ?? undefined,
      experiencias: cv.experiencias?.map((e) => ({
        cargo: e.cargo as string,
        empresa: e.empresa as string,
        periodo: e.periodo as string,
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

  // Renderiza o HTML do template dentro de um iframe (isolado do CSS da app).
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-4">
        Preview — {templateId}
      </h1>
      <iframe
        srcDoc={html}
        className="w-full h-[80vh] border border-line rounded-lg bg-surface"
        title="Preview do currículo"
      />
    </div>
  );
}
