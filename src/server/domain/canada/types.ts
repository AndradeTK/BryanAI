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

/** Status de autorização que exigem sponsorship/LMIA (vaga que proíbe = bloqueio). */
export const NEEDS_SPONSORSHIP: WorkAuthorization[] = [
  "needs_lmia",
  "needs_sponsorship",
  "study_permit",
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

/** Verdictos que a análise pode produzir sobre o fit canadense. */
export type WorkAuthVerdict = "ok" | "needs_sponsorship_blocker" | "unclear";
export type LanguageVerdict = "ok" | "below_requirement" | "unclear";
