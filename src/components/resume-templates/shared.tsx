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

/**
 * Resolve a lista de seções na ordem (config do usuário ou padrão canadense).
 *
 * Uma ordem salva antes de uma seção existir não a menciona — e devolver a
 * lista salva crua faria a seção nova nunca aparecer, sem erro nenhum, para
 * quem já tinha mexido em Configurações. Seções desconhecidas pela config
 * entram no fim, na ordem padrão, até o usuário escolher onde as quer.
 */
export function resolveOrder(order?: SectionName[]): SectionName[] {
  if (!order?.length) return DEFAULT_SECTION_ORDER;
  const faltando = DEFAULT_SECTION_ORDER.filter((s) => !order.includes(s));
  return [...order, ...faltando];
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
