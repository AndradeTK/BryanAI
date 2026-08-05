import { z } from "zod";

/**
 * Domínio canadense — Fase 2.
 * Os tipos e enums de autorização de trabalho, língua e credenciais.
 */

export const WorkAuthorization = z.enum([
  "citizen",
  "pr",
  "pgwp",
  "owp",
  "spouse_owp",
  "study_permit",
  "needs_lmia",
  "needs_sponsorship",
]);
export type WorkAuthorization = z.infer<typeof WorkAuthorization>;

/**
 * Status que realmente exigem sponsorship/LMIA — vaga que proíbe patrocínio é
 * bloqueio de verdade para eles.
 *
 * `study_permit` NÃO entra aqui. Quem tem study permit está legalmente
 * autorizado a trabalhar: 24h/semana fora do campus durante o período letivo,
 * tempo integral nas férias programadas (teto de 180 dias/ano) e, desde
 * 2026-04-01, sem permissão separada para co-op de até 50% da carga do curso.
 * Tratá-lo como "precisa de patrocínio" zerava toda vaga que dissesse "must be
 * legally authorized" — inclusive estágios e co-ops, que são exatamente os que
 * o estudante pode assumir. Ver `workAuthVerdict`.
 */
export const NEEDS_SPONSORSHIP: WorkAuthorization[] = [
  "needs_lmia",
  "needs_sponsorship",
];

export const CanadaProfileSchema = z.object({
  work_authorization: WorkAuthorization,
  authorized_provinces: z.array(z.string()),
  preferred_provinces: z.array(z.string()),
  clb_english: z.number().min(1).max(12).nullable(),
  nclc_french: z.number().min(1).max(12).nullable(),
  language_test: z.enum(["none", "ielts", "celpip", "tef", "tcf"]),
  eca_status: z.enum(["none", "in_progress", "wes", "ices", "iqas", "ces", "icas"]),
  eca_equivalency: z.string().nullable(),
  regulated_profession: z.string().nullable(),
  license_status: z.enum(["na", "not_started", "in_progress", "licensed"]),
  canadian_exp_months: z.number().min(0),
});
export type CanadaProfile = z.infer<typeof CanadaProfileSchema>;

/**
 * Verdictos que a análise pode produzir sobre o fit canadense.
 *
 * `study_permit_limited` é distinto de bloqueio: o candidato PODE se
 * candidatar, mas não pode cumprir carga integral durante o período letivo.
 * Não zera o score — a compatibilidade técnica continua valendo, e a limitação
 * aparece como alerta.
 */
export type WorkAuthVerdict =
  | "ok"
  | "needs_sponsorship_blocker"
  | "study_permit_limited"
  | "unclear";
export type LanguageVerdict = "ok" | "below_requirement" | "unclear";
