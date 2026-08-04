import { generateStructured, MODELS } from "./client";
import {
  JobFitAnalysisSchema,
  QuickAnalysisSchema,
  ExternalResumeAnalysisSchema,
  type JobFitAnalysis,
  type JobFitAnalysisWithCanada,
  type CanadianVerdicts,
  type QuickAnalysis,
  type ExternalResumeAnalysis,
} from "./schemas";
import { ANALYZER_SYSTEM_PROMPT } from "./prompts";
import type { Curriculo, Vaga } from "./types";
import {
  workAuthVerdict,
  languageVerdict,
  regulatedProfessionGap,
} from "@/server/domain/canada/rules";

/** Monta o bloco de grounding canadense para o prompt (se houver perfil). */
function canadaGrounding(curriculo: Curriculo): string {
  const c = curriculo.canada;
  if (!c) return "";
  return `
CONTEXTO CANADENSE DO CANDIDATO (considere ao avaliar):
- Autorização de trabalho: ${c.work_authorization}
- Inglês CLB: ${c.clb_english ?? "não avaliado"} | Francês NCLC: ${c.nclc_french ?? "não avaliado"}
- Equivalência de diploma (ECA): ${c.eca_status}${c.eca_equivalency ? ` — ${c.eca_equivalency}` : ""}
- Profissão regulada: ${c.regulated_profession ?? "não aplica"} (licença: ${c.license_status})
- Experiência canadense: ${c.canadian_exp_months} meses
- Províncias preferidas: ${c.preferred_provinces.join(", ") || "não informado"}`;
}

/**
 * Análise completa de compatibilidade currículo × vaga.
 *
 * Fase 2: roda as regras determinísticas ANTES do Gemini. Se a vaga exige
 * autorização de trabalho que o candidato não tem, retorna score 0 SEM chamar a
 * IA (não gasta token com vaga impossível).
 */
export async function analyzeJobFit(
  curriculo: Curriculo,
  vaga: Vaga,
): Promise<JobFitAnalysisWithCanada> {
  const jobText = `${vaga.titulo}\n${vaga.descricao}`;

  // Regras determinísticas (antes do LLM).
  const canadian: CanadianVerdicts | undefined = curriculo.canada
    ? {
        work_auth_verdict: workAuthVerdict(
          { work_authorization: curriculo.canada.work_authorization as never },
          jobText,
        ),
        language_verdict: languageVerdict(
          { nclc_french: curriculo.canada.nclc_french },
          { text: jobText },
        ),
        regulated_gap: regulatedProfessionGap(
          {
            regulated_profession: curriculo.canada.regulated_profession,
            license_status: curriculo.canada.license_status as never,
          },
          jobText,
        ),
      }
    : undefined;

  // Short-circuit: vaga impossível → score 0, sem gastar token.
  if (canadian?.work_auth_verdict === "needs_sponsorship_blocker") {
    return {
      score: 0,
      nivel_compatibilidade: "Baixo",
      resumo_executivo:
        "Esta vaga exige autorização de trabalho no Canadá que você ainda não possui (ela indica que não patrocina). Sem sponsorship/LMIA, a candidatura tende a ser descartada automaticamente.",
      pontos_fortes: [],
      gaps_identificados: [
        {
          gap: "Autorização de trabalho no Canadá",
          criticidade: "Crítico",
          sugestao_acao:
            "Priorize vagas que patrocinam, ou obtenha PR/PGWP/Open Work Permit antes de aplicar.",
        },
      ],
      keywords_match: { presentes: [], ausentes: [] },
      recomendacoes_adaptacao: [],
      experiencias_destacar: [],
      probabilidade_entrevista: "Baixa",
      noc_suggestion: null,
      canadian,
    };
  }

  const prompt = `${ANALYZER_SYSTEM_PROMPT}
${canadaGrounding(curriculo)}

DADOS DO CANDIDATO:
${JSON.stringify(curriculo, null, 2)}

VAGA ALVO:
Título: ${vaga.titulo}
Descrição:
${vaga.descricao}

TAREFA: Analise a compatibilidade e retorne o JSON estruturado com score (0-100),
nível, resumo executivo, pontos fortes, gaps, keywords_match, recomendações,
experiências a destacar, probabilidade de entrevista, e noc_suggestion (código
NOC 2021 de 5 dígitos mais provável para esta vaga + confidence 0-1, ou null se
incerto).`;

  const analise: JobFitAnalysis = await generateStructured({
    model: MODELS.fast,
    schema: JobFitAnalysisSchema,
    prompt,
    temperature: 0.3,
  });

  return { ...analise, canadian };
}

/** Análise rápida (extensão): só score, resumo e fit. */
export async function quickAnalysis(
  curriculo: Curriculo,
  vaga: Vaga,
): Promise<QuickAnalysis> {
  const prompt = `Você é um Recrutador Técnico Sênior muito experiente. Analise a compatibilidade entre o candidato e a vaga de forma JUSTA e EQUILIBRADA, considerando habilidades TRANSFERÍVEIS.

ESCALA DE SCORE:
- 85-100: Match excelente
- 70-84: Bom match, gaps menores
- 55-69: Match médio, gaps importantes
- 40-54: Match baixo
- 0-39: Não recomendado

CANDIDATO:
${JSON.stringify(curriculo, null, 1)}

VAGA: ${vaga.titulo}
${vaga.descricao?.substring(0, 1000)}

Retorne score (0-100), resumo (1-2 frases destacando pontos positivos e gaps) e
fit (Baixo|Médio|Alto|Excelente).`;

  return generateStructured({
    model: MODELS.fast,
    schema: QuickAnalysisSchema,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 1024,
  });
}

/** Análise de currículo externo (texto extraído de PDF/DOCX). */
export async function analyzeExternalResume(
  textoExtraido: string,
  vaga: Vaga,
): Promise<ExternalResumeAnalysis> {
  const prompt = `${ANALYZER_SYSTEM_PROMPT}

CURRÍCULO DO CANDIDATO (texto extraído de arquivo):
---
${textoExtraido.substring(0, 10000)}
---

VAGA ALVO:
Título: ${vaga.titulo}
Descrição:
${vaga.descricao}

TAREFA: Analise a compatibilidade. O texto foi extraído automaticamente de um
PDF/DOCX — ignore problemas de formatação. Além da análise padrão, identifique o
candidato (nome, cargo atual, anos de experiência), avalie a qualidade do
currículo (nota 1-10, pontos positivos, melhorias) e sugira próximos passos.`;

  return generateStructured({
    model: MODELS.fast,
    schema: ExternalResumeAnalysisSchema,
    prompt,
    temperature: 0.3,
  });
}
