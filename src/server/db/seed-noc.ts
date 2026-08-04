import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { embedBatch } from "../ai/embeddings";
import { TaskType } from "@google/generative-ai";
import { toVectorLiteral } from "./repositories";

/**
 * Seed do catálogo NOC 2021 (#12): lê o CSV oficial do StatCan (embutido no
 * repo), filtra os 516 unit groups (nível 5, código de 5 dígitos), gera os
 * embeddings em lote e insere com o vetor.
 *
 * Rodar dentro do container (tem GEMINI_API_KEY):
 *   docker exec bryanai-app node --experimental-strip-types /app/src/server/db/seed-noc.ts
 * ou via tsx local com --env-file=.env.
 */

interface Row {
  code: string;
  title: string;
  definition: string;
}

// Parser de CSV simples que respeita aspas (a definição tem vírgulas).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch === "\r") { /* ignora */ }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  const csv = readFileSync(join(process.cwd(), "src/server/db/noc-2021.csv"), "utf8");
  const rows = parseCsv(csv);
  // Colunas: Level, Hierarchical structure, Code, Class title, Class definition
  const unitGroups: Row[] = rows
    .filter((r) => r[0] === "5" && r[2]?.length === 5)
    .map((r) => ({ code: r[2], title: r[3], definition: r[4] ?? "" }));

  console.log(`[noc] ${unitGroups.length} unit groups a inserir`);

  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < unitGroups.length; i += BATCH) {
    const chunk = unitGroups.slice(i, i + BATCH);
    const texts = chunk.map((u) => `${u.title}. ${u.definition}`.slice(0, 2000));
    const embeddings = await embedBatch(texts, TaskType.RETRIEVAL_DOCUMENT);

    for (let j = 0; j < chunk.length; j++) {
      const u = chunk[j];
      const lit = toVectorLiteral(embeddings[j]);
      await db.execute(sql`
        INSERT INTO noc_codes (code, title, definition, teer, embedding)
        VALUES (${u.code}, ${u.title}, ${u.definition}, ${u.code[1]}, ${lit}::vector(3072))
        ON CONFLICT (code) DO UPDATE SET
          title = EXCLUDED.title, definition = EXCLUDED.definition, embedding = EXCLUDED.embedding
      `);
    }
    inserted += chunk.length;
    console.log(`[noc] ${inserted}/${unitGroups.length}`);
  }

  console.log("[noc] concluído.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[noc] erro:", e);
  process.exit(1);
});
