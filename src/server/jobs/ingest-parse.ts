import { createHash } from "node:crypto";

/**
 * Parsing puro de vagas (sem IA nem DB — testável isoladamente).
 *
 * Fonte primária: JSON-LD schema.org/JobPosting, que quase todo ATS moderno
 * (Job Bank, Greenhouse, Lever, Ashby, Workday, LinkedIn, Indeed) emite —
 * muito mais robusto que seletores CSS por site.
 */

export interface ParsedJob {
  titulo: string;
  empresa: string | null;
  descricao: string;
  localizacao: string | null;
  url: string | null;
  source: string;
  salaryRaw: string | null;
  datePosted: string | null;
}

/** Remove tags HTML e normaliza espaços (a descrição do JSON-LD vem em HTML). */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Achata jobLocation (schema.org) em "Cidade, Província, País". */
function formatLocation(loc: unknown): string | null {
  if (!loc) return null;
  const first = Array.isArray(loc) ? loc[0] : loc;
  const addr = (first as { address?: Record<string, unknown> })?.address ?? first;
  if (!addr || typeof addr !== "object") return null;
  const a = addr as Record<string, unknown>;
  const parts = [a.addressLocality, a.addressRegion, a.addressCountry]
    .map((p) => (typeof p === "string" ? p : (p as { name?: string })?.name))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Formata baseSalary (schema.org MonetaryAmount) num texto legível. */
function formatSalary(salary: unknown): string | null {
  if (!salary || typeof salary !== "object") return null;
  const s = salary as Record<string, unknown>;
  const value = s.value as Record<string, unknown> | undefined;
  if (!value) return null;
  const currency = (s.currency as string) ?? "";
  const min = value.minValue ?? value.value;
  const max = value.maxValue;
  const unit = value.unitText ?? "";
  if (min == null) return null;
  const range = max != null ? `${min}–${max}` : `${min}`;
  return `${currency} ${range} ${unit}`.trim();
}

/** Extrai todos os objetos JSON-LD de um HTML (sem DOM — roda no server). */
function extractJsonLdObjects(html: string): unknown[] {
  const out: unknown[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // bloco malformado — ignora
    }
  }
  return out;
}

/** Encontra o nó JobPosting entre os objetos JSON-LD (inclusive em @graph). */
function findJobPosting(objects: unknown[]): Record<string, unknown> | null {
  const isJob = (o: unknown): o is Record<string, unknown> => {
    const t = (o as { "@type"?: unknown })?.["@type"];
    return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
  };
  for (const obj of objects) {
    if (isJob(obj)) return obj;
    const graph = (obj as { "@graph"?: unknown[] })?.["@graph"];
    if (Array.isArray(graph)) {
      const found = graph.find(isJob);
      if (found) return found as Record<string, unknown>;
    }
  }
  return null;
}

/** Parseia JSON-LD JobPosting a partir do HTML da página. Null se não houver. */
export function parseJsonLd(html: string, url?: string): ParsedJob | null {
  const job = findJobPosting(extractJsonLdObjects(html));
  if (!job) return null;

  const org = job.hiringOrganization as { name?: string } | string | undefined;
  const empresa = typeof org === "string" ? org : (org?.name ?? null);
  const descRaw = (job.description as string) ?? "";

  return {
    titulo: (job.title as string) ?? "Sem título",
    empresa,
    descricao: stripHtml(descRaw),
    localizacao: formatLocation(job.jobLocation),
    url: (job.url as string) ?? url ?? null,
    source: "jsonld",
    salaryRaw: formatSalary(job.baseSalary),
    datePosted: (job.datePosted as string)?.slice(0, 10) ?? null,
  };
}

/** Monta um ParsedJob a partir de entrada manual (sem JSON-LD). */
export function parseManual(input: {
  titulo: string;
  descricao: string;
  empresa?: string;
  localizacao?: string;
  url?: string;
}): ParsedJob {
  return {
    titulo: input.titulo,
    empresa: input.empresa ?? null,
    descricao: input.descricao,
    localizacao: input.localizacao ?? null,
    url: input.url ?? null,
    source: "manual",
    salaryRaw: null,
    datePosted: null,
  };
}

/** Hash de dedup: sha256(lower(empresa|titulo|cidade)). */
export function computeDedupHash(job: ParsedJob): string {
  const cidade = job.localizacao?.split(",")[0]?.trim() ?? "";
  const key = `${job.empresa ?? ""}|${job.titulo}|${cidade}`.toLowerCase();
  return createHash("sha256").update(key).digest("hex");
}
