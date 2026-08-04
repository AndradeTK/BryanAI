/**
 * Conversão CEFR → CLB (Canadian Language Benchmark).
 * O mapeamento é APROXIMADO por design — os sistemas de teste são diferentes,
 * então não há conversão 1:1. Usamos o mínimo da faixa para NÃO superestimar o
 * candidato (superestimar num CV que vai a um recrutador é pior que subestimar).
 * Ref: B2≈CLB7-8, C1≈CLB9-10, C2≈CLB11-12.
 */

const CEFR_TO_CLB: Record<string, { min: number; max: number }> = {
  C2: { min: 11, max: 12 },
  C1: { min: 9, max: 10 },
  B2: { min: 7, max: 8 },
  B1: { min: 5, max: 6 },
  A2: { min: 3, max: 4 },
  A1: { min: 1, max: 2 },
};

/** Extrai o nível CEFR de um texto livre (ex.: "B2 - Intermediário Avançado"). */
function extractCefr(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.toUpperCase().match(/\b([ABC][12])\b/);
  return m ? m[1] : null;
}

/** Deriva o CLB (mínimo conservador da faixa) a partir de um nível/ texto CEFR. */
export function cefrToClb(cefrOrText: string | null | undefined): number | null {
  const cefr = extractCefr(cefrOrText);
  return cefr ? (CEFR_TO_CLB[cefr]?.min ?? null) : null;
}
