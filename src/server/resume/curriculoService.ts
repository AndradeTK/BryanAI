import {
  perfilRepo,
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  canadaProfileRepo,
  documentRepo,
} from "@/server/db/repositories";
import type { Curriculo } from "@/server/ai/types";

/**
 * Agrega os dados do banco no shape que a camada de IA e os templates consomem.
 *
 * Fronteira de mapeamento: o Drizzle devolve camelCase (nomeCompleto), mas os
 * prompts e templates falam o vocabulário do modelo antigo (nome_completo,
 * tags_tecnicas). Este service traduz — assim os consumidores não precisam saber
 * do banco.
 */

function periodoOf(inicio: string | null, fim: string | null): string {
  const fmt = (d: string | null) => (d ? d.slice(0, 7) : ""); // YYYY-MM
  return `${fmt(inicio)} - ${fim ? fmt(fim) : "Atual"}`;
}

export async function getFullResume(): Promise<Curriculo> {
  const [perfil, exps, formacaoTudo, cursos, idiomas, canada, docsIa] =
    await Promise.all([
      perfilRepo.get(),
      experienciaRepo.getAll(),
      formacaoRepo.getAll(),
      cursoRepo.getAll(),
      idiomaRepo.getAll(),
      canadaProfileRepo.get(),
      documentRepo.getForAi(),
    ]);

  // Textos das reference letters (só as com texto extraído), limitados para não
  // estourar o prompt.
  const documentos_referencia = docsIa
    .filter((d) => d.extractedText && d.extractedText.trim().length >= 30)
    .map((d) => ({
      titulo: d.title,
      texto: d.extractedText!.slice(0, 2500),
    }));

  return {
    documentos_referencia,
    canada: canada
      ? {
          work_authorization: canada.workAuthorization,
          clb_english: canada.clbEnglish,
          nclc_french: canada.nclcFrench,
          eca_status: canada.ecaStatus ?? "none",
          eca_equivalency: canada.ecaEquivalency,
          regulated_profession: canada.regulatedProfession,
          license_status: canada.licenseStatus ?? "na",
          preferred_provinces: canada.preferredProvinces ?? [],
          canadian_exp_months: canada.canadianExpMonths ?? 0,
          canadian_city: canada.canadianCity ?? null,
          canadian_phone: canada.canadianPhone ?? null,
        }
      : null,
    perfil: perfil
      ? {
          nome_completo: perfil.nomeCompleto,
          email: perfil.email ?? undefined,
          telefone: perfil.telefone ?? undefined,
          localizacao: perfil.localizacao ?? undefined,
          linkedin: perfil.linkedin ?? undefined,
          github: perfil.github ?? undefined,
          resumo_base: perfil.resumoBase ?? undefined,
        }
      : null,
    experiencias: exps.map((e) => ({
      cargo: e.cargo,
      empresa: e.empresa,
      periodo: periodoOf(e.dataInicio, e.dataFim),
      data_inicio: e.dataInicio,
      data_fim: e.dataFim,
      descricao_atividades: e.descricaoAtividades,
      principais_conquistas: e.principaisConquistas,
      tags_tecnicas: e.tagsTecnicas?.join(", ") ?? "",
    })),
    formacao: formacaoTudo
      .filter((f) => f.tipo === "educacao")
      .map((f) => ({
        titulo_curso: f.tituloCurso,
        instituicao_projeto: f.instituicaoProjeto,
        status: f.status,
      })),
    projetos: formacaoTudo
      .filter((f) => f.tipo === "projeto")
      .map((f) => ({
        instituicao_projeto: f.instituicaoProjeto,
        descricao_detalhada: f.descricaoDetalhada,
        link: f.link ?? undefined,
      })),
    cursos_certificacoes: cursos.map((c) => ({
      titulo_do_curso: c.tituloDoCurso,
      emissor_instituicao: c.emissorInstituicao,
      descricao: c.descricao,
      link: c.link ?? undefined,
    })),
    cursos: cursos.map((c) => ({
      titulo_do_curso: c.tituloDoCurso,
      emissor_instituicao: c.emissorInstituicao,
      link: c.link ?? undefined,
    })),
    idiomas: idiomas.map((i) => ({
      idioma: i.idioma,
      nivel_cefr: i.nivelCefr,
    })),
  };
}

export interface ValidationIssue {
  campo: string;
  mensagem: string;
  criticidade: "alta" | "media" | "baixa";
}

export interface ValidationResult {
  valido: boolean;
  completo: boolean;
  issues: ValidationIssue[];
  completude: number;
}

/** Valida se o currículo tem o mínimo para gerar/analisar. */
export async function validateResume(): Promise<ValidationResult> {
  const c = await getFullResume();
  const issues: ValidationIssue[] = [];

  if (!c.perfil) {
    issues.push({ campo: "Perfil", mensagem: "Perfil não cadastrado", criticidade: "alta" });
  } else {
    if (!c.perfil.nome_completo)
      issues.push({ campo: "Nome", mensagem: "Nome não informado", criticidade: "alta" });
    if (!c.perfil.email)
      issues.push({ campo: "Email", mensagem: "Email não informado", criticidade: "alta" });
    if (!c.perfil.resumo_base)
      issues.push({ campo: "Resumo", mensagem: "Resumo profissional não informado", criticidade: "media" });
  }
  if (!c.experiencias || c.experiencias.length === 0)
    issues.push({ campo: "Experiências", mensagem: "Nenhuma experiência cadastrada", criticidade: "media" });
  if (!c.formacao || c.formacao.length === 0)
    issues.push({ campo: "Formação", mensagem: "Nenhuma formação cadastrada", criticidade: "baixa" });

  return {
    valido: issues.filter((i) => i.criticidade === "alta").length === 0,
    completo: issues.length === 0,
    issues,
    completude: calculateCompletude(c),
  };
}

function calculateCompletude(c: Curriculo): number {
  let total = 0;
  let preenchido = 0;

  total += 30; // perfil
  if (c.perfil) {
    if (c.perfil.nome_completo) preenchido += 5;
    if (c.perfil.email) preenchido += 5;
    if (c.perfil.telefone) preenchido += 3;
    if (c.perfil.linkedin) preenchido += 3;
    if (c.perfil.github) preenchido += 2;
    if (c.perfil.resumo_base) preenchido += 10;
  }
  total += 35; // experiências
  if (c.experiencias?.length) preenchido += Math.min(35, c.experiencias.length * 15);
  total += 15; // formação
  if (c.formacao?.length) preenchido += Math.min(15, c.formacao.length * 7);
  total += 10; // cursos
  if (c.cursos_certificacoes?.length)
    preenchido += Math.min(10, c.cursos_certificacoes.length * 3);
  total += 10; // idiomas
  if (c.idiomas?.length) preenchido += Math.min(10, c.idiomas.length * 5);

  return Math.round((preenchido / total) * 100);
}
