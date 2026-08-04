/**
 * Props dos templates de currículo.
 *
 * Reflete o output do ResumeSchema (dados reescritos pela IA) + os dados do
 * perfil. Todos os 5 templates são single-column e ATS-safe (padrão canadense:
 * sem colunas, sem tabelas, sem foto/idade/nacionalidade — protegido por schema).
 */

export interface Perfil {
  nome_completo?: string;
  email?: string;
  telefone?: string;
  localizacao?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumo_base?: string;
}

export interface ExperienciaItem {
  cargo?: string;
  empresa?: string;
  localizacao?: string; // cidade, província — quando disponível
  periodo?: string;
  bullets?: string[];
}

export interface HabilidadesTecnicas {
  principais?: string[];
  secundarias?: string[];
}

export interface FormacaoItem {
  titulo_curso?: string;
  instituicao_projeto?: string;
  status?: string;
  // Equivalência canadense do diploma (ECA/WES). Renderizada quando existe.
  canadian_equivalency?: string | null;
}

export interface CursoItem {
  titulo_do_curso?: string;
  emissor_instituicao?: string;
  link?: string;
}

export interface IdiomaItem {
  idioma?: string;
  nivel_cefr?: string;
}

export interface ProjetoItem {
  instituicao_projeto?: string;
  descricao_detalhada?: string;
  tecnologias?: string;
  link?: string;
}

/** Os dados reescritos pela IA. */
export interface CurriculoOtimizado {
  titulo_profissional?: string;
  resumo_profissional?: string;
  experiencias?: ExperienciaItem[];
  habilidades_tecnicas?: HabilidadesTecnicas;
}

export type SectionName =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "certifications"
  | "languages"
  | "projects";

export interface ResumeTemplateProps {
  perfil?: Perfil | null;
  curriculo?: CurriculoOtimizado | null;
  formacao?: FormacaoItem[];
  projetos?: ProjetoItem[];
  cursos?: CursoItem[];
  idiomas?: IdiomaItem[];
  lang?: string;
  sectionsOrder?: SectionName[];
}

/**
 * Ordem de seções padrão — CONVENÇÃO CANADENSE:
 * Contato → Resumo → Experiência → Habilidades → Formação → Certificações.
 * (Fonte: Job Bank / guias ATS canadenses 2026 — experiência antes de skills,
 * educação depois da experiência para candidatos com histórico profissional.)
 */
export const DEFAULT_SECTION_ORDER: SectionName[] = [
  "summary",
  "experience",
  "skills",
  "education",
  "certifications",
  "languages",
  "projects",
];
