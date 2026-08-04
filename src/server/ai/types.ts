/**
 * Tipos de entrada dos services de IA.
 * Refletem o shape que os prompts consomem hoje (agregado por curriculoService).
 * Frouxos de propósito nesta fase — a Fase 4 (Postgres/Drizzle) define os
 * tipos canônicos do banco.
 */

export interface Vaga {
  titulo: string;
  descricao: string;
  empresa?: string;
}

export interface Curriculo {
  perfil?: {
    nome_completo?: string;
    email?: string;
    telefone?: string;
    localizacao?: string;
    linkedin?: string;
    github?: string;
    resumo_base?: string;
  } | null;
  resumo?: string;
  experiencias?: Array<Record<string, unknown>>;
  formacao?: Array<Record<string, unknown>>;
  projetos?: Array<Record<string, unknown>>;
  cursos_certificacoes?: Array<Record<string, unknown>>;
  cursos?: Array<Record<string, unknown>>;
  idiomas?: Array<Record<string, unknown>>;
  /**
   * Textos de documentos anexados pelo usuário (reference letters etc.) marcados
   * para uso pela IA (Fase 11). Fonte factual de conquistas/elogios — a IA pode
   * citar, mas nunca inventar além do que está escrito.
   */
  documentos_referencia?: Array<{ titulo: string; texto: string }>;
  /** Perfil canadense (Fase 2) — grounding para a análise/geração. */
  canada?: {
    work_authorization: string;
    clb_english: number | null;
    nclc_french: number | null;
    eca_status: string;
    eca_equivalency: string | null;
    regulated_profession: string | null;
    license_status: string;
    preferred_provinces: string[];
    canadian_exp_months: number;
    canadian_city?: string | null;
    canadian_phone?: string | null;
  } | null;
}
