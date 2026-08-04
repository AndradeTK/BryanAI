import type { Config } from "drizzle-kit";

/**
 * Só para `drizzle-kit generate` (gerar SQL a partir do schema).
 * A APLICAÇÃO das migrations é feita por scripts/migrate.mjs, que roda no deploy
 * e mantém a tabela de controle `_migrations`.
 */
export default {
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
