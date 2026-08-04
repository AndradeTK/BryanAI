import { z } from "zod";

/**
 * Valida as variáveis de ambiente no boot.
 * Falha cedo e com mensagem clara se algo essencial faltar — em vez de o erro
 * só aparecer quando a IA ou o banco forem chamados (comportamento antigo).
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // PostgreSQL (via Drizzle)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória")
    .default("postgresql://bryanai:bryanai_dev@127.0.0.1:5433/bryanai"),

  // Gemini
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY é obrigatória"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  /**
   * Segredo de assinatura das sessões. 32 chars é o piso para HS256 não ser o
   * elo fraco. Trocar o valor invalida todas as sessões emitidas.
   */
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET precisa de no mínimo 32 caracteres"),

  /**
   * Token da extensão Chrome. Opcional: sem ele, as rotas da extensão ficam
   * desligadas (responde 503) em vez de abertas — falha fechada, não aberta.
   */
  EXTENSION_API_TOKEN: z.string().min(24).optional(),

  /**
   * Onde ficam PDFs/DOCX gerados e documentos enviados. Em produção precisa
   * apontar para fora do diretório do release — senão cada deploy apaga tudo.
   */
  STORAGE_DIR: z.string().default("./generated"),

  /** URL pública da aplicação. Usada para links absolutos e checagem de origem. */
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === "production";
