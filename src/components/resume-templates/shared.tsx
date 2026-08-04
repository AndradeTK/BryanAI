import { canadianSpelling, translateTerm } from "./i18n";
import type { ResumeTemplateProps, SectionName } from "./types";
import { DEFAULT_SECTION_ORDER } from "./types";

/**
 * Peças compartilhadas pelos templates. Cada template compõe estas peças (ou as
 * suas próprias variações) com o markup/classes que o seu CSS espera.
 * Todos single-column e ATS-safe — sem foto/idade/nacionalidade (padrão canadense).
 */

export function stripUrl(url: string): string {
  return url
    .replace("https://www.linkedin.com/in/", "linkedin.com/in/")
    .replace("https://github.com/", "github.com/")
    .replace("https://", "");
}

/**
 * Verdadeiro só se `v` parece um link real. A IA às vezes preenche campos de URL
 * com "Not Applicable"/"N/A" em vez de deixar vazio; isso os filtra para não
 * renderizarem lixo no lugar do link.
 */
export function isUrl(v: string | undefined | null): v is string {
  if (!v) return false;
  const s = v.trim();
  return /^https?:\/\//i.test(s) || /(github\.com|linkedin\.com|\.[a-z]{2,}\/)/i.test(s);
}

/** Aplica grafia canadense a texto renderizado (no-op fora de inglês). */
export function ca(text: string | undefined, lang: string): string {
  return canadianSpelling(text, lang);
}

/** Resolve a lista de seções na ordem (config do usuário ou padrão canadense). */
export function resolveOrder(order?: SectionName[]): SectionName[] {
  return order?.length ? order : DEFAULT_SECTION_ORDER;
}

/** Todas as skills achatadas (principais + secundárias). */
export function allSkills(props: ResumeTemplateProps): string[] {
  const s = props.curriculo?.habilidades_tecnicas;
  return [...(s?.principais ?? []), ...(s?.secundarias ?? [])];
}

/** Traduz nome/nível de idioma e aplica grafia canadense. */
export function langTerm(text: string | undefined, lang: string): string {
  return translateTerm(text, lang);
}
