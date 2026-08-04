import { generateStructured, MODELS } from "./client";
import {
  SkillsGapSchema,
  MarketAnalysisSchema,
  StudyPlanSchema,
  type SkillsGap,
  type MarketAnalysis,
  type StudyPlan,
} from "./schemas";
import type { Curriculo } from "./types";

export interface Alvo {
  titulo: string;
  descricao?: string;
  nivel?: string;
}

/**
 * Analisa gaps de habilidades e gera roadmap de desenvolvimento.
 * Lança em erro (não retorna {success:false}) — consistente com os demais services.
 *
 */
export async function analyze(
  curriculo: Curriculo,
  alvo: Alvo,
): Promise<SkillsGap> {
  const prompt = `Você é um especialista em desenvolvimento de carreira e análise de competências.

PERFIL ATUAL DO CANDIDATO:
${JSON.stringify(curriculo, null, 1)}

CARGO/VAGA ALVO:
Título: ${alvo.titulo}
${alvo.descricao ? `Descrição: ${alvo.descricao}` : ""}
${alvo.nivel ? `Nível: ${alvo.nivel}` : ""}

Faça uma análise completa de Skills Gap e gere um roadmap de desenvolvimento em
3 fases. Inclua: análise geral (score, nível atual/alvo, tempo de transição),
habilidades atuais, gaps identificados, roadmap (fase_1/2/3 com recursos),
certificações recomendadas, projetos sugeridos, mentoria/networking e próximos
passos. Seja específico com links reais de cursos (Coursera, Udemy, LinkedIn
Learning, YouTube) e certificações (AWS, Google, Microsoft) quando possível.`;

  return generateStructured({
    model: MODELS.fast,
    schema: SkillsGapSchema,
    prompt,
  });
}

/** Compara o perfil com as demandas de mercado de uma área. */
export async function compareMarket(
  curriculo: Curriculo,
  area: string,
): Promise<MarketAnalysis> {
  const prompt = `Analise o perfil do candidato e compare com as demandas atuais do mercado na área de ${area}.

PERFIL DO CANDIDATO:
${JSON.stringify(curriculo, null, 2)}

Retorne: posição no mercado, score de empregabilidade (0-100), tendências
(tecnologia + status Em alta/Estável/Em queda + se o candidato tem), diferenciais,
pontos de atenção, salário estimado (junior/pleno/senior + posição do candidato)
e tipos de empresas que combinam com o perfil.`;

  return generateStructured({
    model: MODELS.fast,
    schema: MarketAnalysisSchema,
    prompt,
  });
}

/** Gera um plano de estudos de 12 semanas para preencher os gaps. */
export async function generateStudyPlan(
  gaps: unknown,
  horasPorSemana = 10,
): Promise<StudyPlan> {
  const prompt = `Crie um plano de estudos detalhado de 12 semanas para preencher estes gaps de habilidades.

GAPS A PREENCHER:
${JSON.stringify(gaps, null, 2)}

DISPONIBILIDADE: ${horasPorSemana} horas por semana

Retorne: plano_semanal (semana, foco, atividades com dia/duração/atividade/recurso,
meta), marcos (semana + conquista), kpis de progresso e dicas de produtividade.`;

  return generateStructured({
    model: MODELS.fast,
    schema: StudyPlanSchema,
    prompt,
  });
}
