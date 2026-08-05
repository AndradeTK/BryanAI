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
 * Sinais de que a vaga cabe na carga permitida a quem estuda: co-op, estágio,
 * meio período, temporada. Nesses casos o study permit basta.
 *
 * `contract` fica de fora de propósito — contrato costuma ser integral, só com
 * prazo determinado.
 */
const STUDENT_FRIENDLY_RE =
  /\bco-?op\b|\bintern(ship)?\b|\bpart[- ]time\b|\bsummer\b|\bseasonal\b|\bstudent\b|work[- ]placement|\bpracticum\b|\bworking student\b|\bestágio\b/i;

/** Sinais de carga integral, que o período letivo não comporta. */
const FULL_TIME_RE = /\bfull[- ]time\b|\bpermanent\b|\b(37\.5|40)\s*(hours|hrs)\b/i;

/**
 * A vaga exige autorização que o candidato não tem?
 *
 * Três desfechos possíveis:
 * - `needs_sponsorship_blocker`: precisa mesmo de patrocínio e a vaga não dá →
 *   score 0, sem gastar token com o LLM.
 * - `study_permit_limited`: tem study permit e a vaga aparenta ser integral.
 *   Não é bloqueio — é alerta de que 24h/semana não cobrem a carga durante as
 *   aulas (embora cubram nas férias programadas).
 * - `ok`: autorizado, ou a vaga não menciona exigência, ou é co-op/estágio/
 *   meio período — que o study permit cobre.
 */
export function workAuthVerdict(
  profile: Pick<CanadaProfile, "work_authorization">,
  jobText: string,
): WorkAuthVerdict {
  const requiresAuth = REQUIRES_AUTH_RE.test(jobText);
  if (!requiresAuth) return "ok";

  if (NEEDS_SPONSORSHIP.includes(profile.work_authorization)) {
    return "needs_sponsorship_blocker";
  }

  if (profile.work_authorization === "study_permit") {
    // Co-op/estágio/meio período cabem na permissão; o resto só é problema se
    // a vaga sinalizar carga integral.
    if (STUDENT_FRIENDLY_RE.test(jobText)) return "ok";
    if (FULL_TIME_RE.test(jobText)) return "study_permit_limited";
    // Sem sinal claro de carga: não inventa restrição.
    return "ok";
  }

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
