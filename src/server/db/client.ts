import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Cliente Drizzle + postgres.js.
 * Uma conexão por processo (o Next reusa entre requests).
 */
const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });
export { schema };
