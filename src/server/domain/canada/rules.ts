import {
  NEEDS_SPONSORSHIP,
  type CanadaProfile,
  type WorkAuthVerdict,
  type LanguageVerdict,
} from "./types";

/**
 * Regras determinísticas do domínio canadense — Fase 2.
 * Rodam ANTES do LLM: se a vaga é impossível (exige autorização que o candidato
 * não tem), retorna bloqueio e o analyze dá score 0 sem gastar token.
 */

const REQUIRES_AUTH_RE =
  /must be (legally )?authorized to work|no sponsorship|not able to sponsor|cannot sponsor|not sponsor|legally (entitled|eligible) to work|authorized to work in canada/i;

/**
 * A vaga exige autorização que o candidato não tem?
 * @returns 'needs_sponsorship_blocker' (score 0) | 'ok' | 'unclear'
 */
export function workAuthVerdict(
  profile: Pick<CanadaProfile, "work_authorization">,
  jobText: string,
): WorkAuthVerdict {
  const requiresAuth = REQUIRES_AUTH_RE.test(jobText);
  const needsSponsor = NEEDS_SPONSORSHIP.includes(profile.work_authorization);
  if (requiresAuth && needsSponsor) return "needs_sponsorship_blocker";
  return "ok";
}

const FRENCH_REQUIRED_RE =
  /français|french (is )?required|bilingual|maîtrise du français|langue française/i;

/**
 * Quebec + francês exigido + NCLC baixo → abaixo do requisito.
 */
export function languageVerdict(
  profile: Pick<CanadaProfile, "nclc_french">,
  job: { province?: string | null; text: string },
): LanguageVerdict {
  const frenchRequired =
    (job.province === "QC" || /quebec|québec|montréal|montreal/i.test(job.text)) &&
    FRENCH_REQUIRED_RE.test(job.text);
  if (frenchRequired && (profile.nclc_french ?? 0) < 7) return "below_requirement";
  return "ok";
}

/**
 * Profissão regulada exigida + não licenciado → gap crítico (NÃO score 0;
 * muitas vagas aceitam "eligible for licensure").
 */
export function regulatedProfessionGap(
  profile: Pick<CanadaProfile, "regulated_profession" | "license_status">,
  jobText: string,
): string | null {
  if (!profile.regulated_profession) return null;
  const prof = profile.regulated_profession;
  const mentioned = new RegExp(prof.replace(/[.]/g, "\\.?"), "i").test(jobText);
  if (mentioned && profile.license_status !== "licensed") {
    return `Vaga menciona ${prof}; você ainda não está licenciado (${profile.license_status}). Muitas vagas aceitam candidatos "eligible for licensure" — considere destacar isso.`;
  }
  return null;
}
