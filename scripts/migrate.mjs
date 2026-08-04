// Aplica as migrations SQL do Drizzle no boot do container.
// Usa o driver `postgres` (já nas deps). Idempotente: registra as migrations
// aplicadas numa tabela de controle e pula as já rodadas.
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL não definida");
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), "src/server/db/migrations");
const sql = postgres(url, { max: 1 });

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    id serial PRIMARY KEY,
    name text UNIQUE NOT NULL,
    applied_at timestamptz DEFAULT now()
  )`;

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [done] = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (done) {
      console.log(`[migrate] já aplicada: ${file}`);
      continue;
    }
    const raw = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }
    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
    console.log(`[migrate] aplicada: ${file}`);
  }

  await sql.end();
  console.log("[migrate] concluído.");
}

main().catch((e) => {
  console.error("[migrate] erro:", e.message);
  process.exit(1);
});
