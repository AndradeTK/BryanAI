import { describe, it, expect } from "vitest";
import {
  parseJsonLd,
  computeDedupHash,
  stripHtml,
  parseManual,
} from "./ingest-parse";

// Fixture no formato que Greenhouse/Lever/Job Bank emitem (JobPosting direto).
const GREENHOUSE_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Senior Backend Developer",
  "description": "<p>We are hiring a <b>backend</b> engineer.</p><ul><li>Node.js</li></ul>",
  "datePosted": "2026-07-01T00:00:00Z",
  "hiringOrganization": { "@type": "Organization", "name": "Acme Corp" },
  "jobLocation": {
    "@type": "Place",
    "address": { "addressLocality": "Toronto", "addressRegion": "ON", "addressCountry": "CA" }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "CAD",
    "value": { "@type": "QuantitativeValue", "minValue": 90000, "maxValue": 120000, "unitText": "YEAR" }
  }
}
</script>
</head><body>...</body></html>`;

// Fixture com o JobPosting dentro de @graph (LinkedIn/Workday costumam usar).
const GRAPH_HTML = `
<script type="application/ld+json">
{ "@context":"https://schema.org", "@graph": [
  { "@type": "WebSite", "name": "Jobs" },
  { "@type": "JobPosting", "title": "Data Engineer", "description": "Build pipelines.",
    "hiringOrganization": "Globex" }
]}
</script>`;

describe("parseJsonLd", () => {
  it("extrai um JobPosting direto (padrão Greenhouse/Job Bank)", () => {
    const job = parseJsonLd(GREENHOUSE_HTML, "https://boards.greenhouse.io/x/123");
    expect(job).not.toBeNull();
    expect(job!.titulo).toBe("Senior Backend Developer");
    expect(job!.empresa).toBe("Acme Corp");
    expect(job!.localizacao).toBe("Toronto, ON, CA");
    expect(job!.source).toBe("jsonld");
    expect(job!.datePosted).toBe("2026-07-01");
    // descrição sem HTML
    expect(job!.descricao).not.toContain("<");
    expect(job!.descricao).toContain("backend");
    // salário formatado
    expect(job!.salaryRaw).toContain("CAD");
    expect(job!.salaryRaw).toContain("90000");
  });

  it("encontra o JobPosting dentro de @graph (LinkedIn/Workday)", () => {
    const job = parseJsonLd(GRAPH_HTML);
    expect(job).not.toBeNull();
    expect(job!.titulo).toBe("Data Engineer");
    expect(job!.empresa).toBe("Globex"); // hiringOrganization como string
  });

  it("retorna null quando não há JSON-LD JobPosting", () => {
    expect(parseJsonLd("<html><body>nada aqui</body></html>")).toBeNull();
  });

  it("ignora blocos JSON-LD malformados sem quebrar", () => {
    const html = `<script type="application/ld+json">{ inválido }</script>` +
      GRAPH_HTML;
    const job = parseJsonLd(html);
    expect(job?.titulo).toBe("Data Engineer");
  });
});

describe("stripHtml", () => {
  it("remove tags e decodifica entidades", () => {
    expect(stripHtml("<p>a&nbsp;&amp;&nbsp;b</p>")).toBe("a & b");
  });
});

describe("computeDedupHash", () => {
  it("é estável e case-insensitive por empresa|titulo|cidade", () => {
    const a = parseManual({ titulo: "Dev", descricao: "x", empresa: "Acme", localizacao: "Toronto, ON" });
    const b = parseManual({ titulo: "dev", descricao: "y", empresa: "ACME", localizacao: "toronto, ON" });
    expect(computeDedupHash(a)).toBe(computeDedupHash(b));
  });

  it("difere quando o título muda", () => {
    const a = parseManual({ titulo: "Dev", descricao: "x", empresa: "Acme" });
    const b = parseManual({ titulo: "Senior Dev", descricao: "x", empresa: "Acme" });
    expect(computeDedupHash(a)).not.toBe(computeDedupHash(b));
  });
});
