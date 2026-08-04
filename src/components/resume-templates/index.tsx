import { Minimalista } from "./Minimalista";
import { Classico } from "./Classico";
import { Executivo } from "./Executivo";
import { Harvard } from "./Harvard";
import { Tech } from "./Tech";
import { TEMPLATE_CSS } from "./styles";
import type { ResumeTemplateProps } from "./types";

/**
 * Os 5 templates de currículo — cada um é um componente React distinto que
 * emite o markup que o seu próprio CSS espera (Opção B: fidelidade estrutural).
 *
 * Todos single-column e ATS-safe, seguindo o padrão canadense: sem colunas,
 * sem tabelas, sem foto/idade/nacionalidade (protegido pela ausência no schema).
 * Diferem em tipografia, cor, hierarquia e — no Tech — ordem das seções.
 *
 * O CSS mora em ./styles/*.css (fonts ATS nativas, sem @import remoto) e é
 * embutido em styles.ts (gerado) para sobreviver ao build standalone.
 */

export type TemplateId =
  | "minimalista"
  | "classico"
  | "executivo"
  | "harvard"
  | "tech";

const TEMPLATES: Record<TemplateId, (p: ResumeTemplateProps) => React.ReactElement> = {
  minimalista: Minimalista,
  classico: Classico,
  executivo: Executivo,
  harvard: Harvard,
  tech: Tech,
};

const VALID_IDS = Object.keys(TEMPLATES) as TemplateId[];

export function isTemplateId(id: string): id is TemplateId {
  return (VALID_IDS as string[]).includes(id);
}

export function getTemplateCss(id: TemplateId): string {
  return TEMPLATE_CSS[id] ?? TEMPLATE_CSS.minimalista;
}

/**
 * O corpo do currículo do template escolhido (sem <html>/<head>). O CSS é
 * injetado pelo caminho do PDF (render.ts) ou pela página de preview.
 */
export function ResumeBody({
  templateId,
  ...props
}: ResumeTemplateProps & { templateId?: string }) {
  const id: TemplateId =
    templateId && isTemplateId(templateId) ? templateId : "minimalista";
  const Template = TEMPLATES[id];
  return <Template {...props} />;
}

export * from "./types";
