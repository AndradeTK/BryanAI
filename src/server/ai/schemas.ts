import { z } from "zod";

/**
 * Contratos Zod dos outputs de IA.
 *
 * Nesta fase (3) os schemas espelham o JSON que os prompts atuais já pedem.
 * A Fase 2 (domínio canadense) endurece estes contratos: introduz o
 * BulletSchema com metric_grounded e o CanadianResumeSchema que PROÍBE
 * foto/idade/nacionalidade por ausência de campo.
 */

// ---------- Análise de Job Fit ----------

export const PontoForteSchema = z.object({
  ponto: z.string(),
  relevancia: z.enum(["Alta", "Média"]),
});

export const GapSchema = z.object({
  gap: z.string(),
  criticidade: z.enum(["Crítico", "Importante", "Menor"]),
  sugestao_acao: z.string(),
});

export const KeywordsMatchSchema = z.object({
  presentes: z.array(z.string()),
  ausentes: z.array(z.string()),
});

export const JobFitAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  nivel_compatibilidade: z.enum(["Baixo", "Médio", "Alto", "Excelente"]),
  resumo_executivo: z.string(),
  pontos_fortes: z.array(PontoForteSchema),
  gaps_identificados: z.array(GapSchema),
  keywords_match: KeywordsMatchSchema,
  recomendacoes_adaptacao: z.array(z.string()),
  experiencias_destacar: z.array(z.string()),
  probabilidade_entrevista: z.enum(["Baixa", "Média", "Alta", "Muito Alta"]),
  // Domínio canadense (Fase 2). O modelo sugere o NOC; os veredictos de
  // work-auth/língua vêm das regras determinísticas (não do modelo).
  noc_suggestion: z
    .object({ code: z.string(), confidence: z.number().min(0).max(1) })
    .nullable(),
});
export type JobFitAnalysis = z.infer<typeof JobFitAnalysisSchema>;

/** Veredictos canadenses anexados à análise (vêm das regras, não do LLM). */
export interface CanadianVerdicts {
  work_auth_verdict:
    | "ok"
    | "needs_sponsorship_blocker"
    | "study_permit_limited"
    | "unclear";
  language_verdict: "ok" | "below_requirement" | "unclear";
  regulated_gap: string | null;
}
export type JobFitAnalysisWithCanada = JobFitAnalysis & {
  canadian?: CanadianVerdicts;
};

// Análise rápida (usada pela extensão): só score/resumo/fit.
export const QuickAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  resumo: z.string(),
  fit: z.enum(["Baixo", "Médio", "Alto", "Excelente"]),
});
export type QuickAnalysis = z.infer<typeof QuickAnalysisSchema>;

// Análise de currículo externo (upload): estende a análise com dados do candidato.
export const ExternalResumeAnalysisSchema = JobFitAnalysisSchema.extend({
  candidato_identificado: z.object({
    nome: z.string(),
    cargo_atual: z.string(),
    experiencia_anos: z.string(),
  }),
  qualidade_curriculo: z.object({
    nota: z.number().min(1).max(10),
    pontos_positivos: z.array(z.string()),
    melhorias_sugeridas: z.array(z.string()),
  }),
  sugestao_proximos_passos: z.string(),
});
export type ExternalResumeAnalysis = z.infer<typeof ExternalResumeAnalysisSchema>;

// ---------- Reescrita de currículo ----------

/**
 * Bullet com anti-alucinação de métricas (Fase 2.5).
 * O modelo só marca metric_grounded=true se a métrica veio DOS DADOS do
 * candidato. Quando não há dado real, metric_grounded=false e metric_placeholder
 * traz um marcador para o usuário preencher — em vez de inventar um número que
 * explodiria numa entrevista.
 */
export const BulletSchema = z.object({
  text: z.string(),
  metric_grounded: z.boolean(),
  metric_placeholder: z.string().nullable(),
});
export type Bullet = z.infer<typeof BulletSchema>;

export const ResumeSchema = z.object({
  titulo_profissional: z.string(),
  resumo_profissional: z.string(),
  experiencias: z.array(
    z.object({
      empresa: z.string(),
      cargo: z.string(),
      periodo: z.string(),
      bullets: z.array(BulletSchema),
    }),
  ),
  habilidades_tecnicas: z.object({
    principais: z.array(z.string()),
    secundarias: z.array(z.string()),
  }),
  formacao: z.array(
    z.object({
      titulo_curso: z.string(),
      instituicao_projeto: z.string(),
      status: z.string(),
      // Equivalência canadense do diploma (Fase 2.4), ex.: "WES-assessed
      // equivalent to a Canadian Bachelor's". null se não aplica.
      canadian_equivalency: z.string().nullable(),
    }),
  ),
  cursos_certificacoes: z.array(
    z.object({
      titulo_do_curso: z.string(),
      emissor_instituicao: z.string(),
      descricao: z.string().optional(),
    }),
  ),
  idiomas: z.array(
    z.object({
      idioma: z.string(),
      nivel_cefr: z.string(),
      certificacao_exame: z.string().optional(),
    }),
  ),
  projetos: z.array(
    z.object({
      instituicao_projeto: z.string(),
      descricao_detalhada: z.string(),
      tecnologias: z.string().optional(),
      link: z.string().optional(),
    }),
  ),
  diferenciais: z.array(z.string()),
  keywords_otimizadas: z.array(z.string()),
  // AUSENTES POR DESIGN (proteção jurídica dos Human Rights Codes provinciais):
  // photo, age, date_of_birth, marital_status, nationality, gender, sin.
  // O modelo com structured output não pode emitir o que o schema não declara.
});
export type Resume = z.infer<typeof ResumeSchema>;

// ---------- Cover letter (melhoria) ----------

export const CoverLetterImprovementSchema = z.object({
  versao_melhorada: z.string(),
  melhorias: z.array(
    z.object({
      original: z.string(),
      sugestao: z.string(),
      motivo: z.string(),
    }),
  ),
  score_original: z.number().min(0).max(100),
  score_melhorado: z.number().min(0).max(100),
});
export type CoverLetterImprovement = z.infer<typeof CoverLetterImprovementSchema>;

// ---------- Skills Gap ----------

const RoadmapFaseSchema = z.object({
  titulo: z.string(),
  duracao: z.string(),
  objetivos: z.array(z.string()),
  recursos: z.array(
    z.object({
      tipo: z.string(),
      nome: z.string(),
      link: z.string().optional(),
      tempo: z.string().optional(),
    }),
  ),
});

export const SkillsGapSchema = z.object({
  analise_geral: z.object({
    score_compatibilidade: z.number().min(0).max(100),
    nivel_atual: z.string(),
    nivel_alvo: z.string(),
    tempo_estimado_transicao: z.string(),
    resumo: z.string(),
  }),
  habilidades_atuais: z.object({
    tecnicas: z.array(z.string()),
    soft_skills: z.array(z.string()),
    nivel_proficiencia: z.record(z.string(), z.string()),
  }),
  gaps_identificados: z.array(
    z.object({
      categoria: z.enum(["Técnica", "Soft Skill", "Certificação", "Idioma"]),
      habilidade: z.string(),
      importancia: z.enum(["Crítica", "Alta", "Média", "Baixa"]),
      descricao: z.string(),
      tempo_para_desenvolver: z.string(),
    }),
  ),
  roadmap: z.object({
    fase_1: RoadmapFaseSchema,
    fase_2: RoadmapFaseSchema,
    fase_3: RoadmapFaseSchema,
  }),
  certificacoes_recomendadas: z.array(
    z.object({
      nome: z.string(),
      emissor: z.string(),
      prioridade: z.enum(["Alta", "Média", "Baixa"]),
      link: z.string().optional(),
      custo_estimado: z.string().optional(),
    }),
  ),
  projetos_sugeridos: z.array(
    z.object({
      tipo: z.string(),
      descricao: z.string(),
      habilidades_desenvolvidas: z.array(z.string()),
    }),
  ),
  mentoria_networking: z.object({
    comunidades: z.array(z.string()),
    eventos: z.array(z.string()),
    perfis_para_seguir: z.array(z.string()),
  }),
  proximos_passos: z.array(
    z.object({ prazo: z.string(), acao: z.string() }),
  ),
});
export type SkillsGap = z.infer<typeof SkillsGapSchema>;

export const MarketAnalysisSchema = z.object({
  posicao_mercado: z.string(),
  score_empregabilidade: z.number().min(0).max(100),
  tendencias: z.array(
    z.object({
      tecnologia: z.string(),
      status: z.enum(["Em alta", "Estável", "Em queda"]),
      candidato_tem: z.boolean(),
    }),
  ),
  diferenciais: z.array(z.string()),
  pontos_atencao: z.array(z.string()),
  salario_estimado: z.object({
    junior: z.string(),
    pleno: z.string(),
    senior: z.string(),
    posicao_candidato: z.string(),
  }),
  empresas_match: z.array(z.string()),
});
export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;

export const StudyPlanSchema = z.object({
  plano_semanal: z.array(
    z.object({
      semana: z.number(),
      foco: z.string(),
      atividades: z.array(
        z.object({
          dia: z.string(),
          duracao: z.string(),
          atividade: z.string(),
          recurso: z.string().optional(),
        }),
      ),
      meta: z.string(),
    }),
  ),
  marcos: z.array(z.object({ semana: z.number(), conquista: z.string() })),
  kpis: z.array(z.string()),
  dicas_produtividade: z.array(z.string()),
});
export type StudyPlan = z.infer<typeof StudyPlanSchema>;

// ---------- Extração de CV (auto-preencher perfil, #11) ----------

export const ExtractedResumeSchema = z.object({
  perfil: z.object({
    nome_completo: z.string(),
    email: z.string(),
    telefone: z.string(),
    localizacao: z.string(),
    linkedin: z.string(),
    github: z.string(),
    resumo_base: z.string(),
  }),
  experiencias: z.array(
    z.object({
      empresa: z.string(),
      cargo: z.string(),
      data_inicio: z.string(), // YYYY-MM ou vazio
      data_fim: z.string(), // vazio = atual
      descricao: z.string(),
      tags: z.array(z.string()),
    }),
  ),
  formacao: z.array(
    z.object({
      instituicao: z.string(),
      curso: z.string(),
      status: z.string(),
    }),
  ),
  idiomas: z.array(z.object({ idioma: z.string(), nivel: z.string() })),
});
export type ExtractedResume = z.infer<typeof ExtractedResumeSchema>;
