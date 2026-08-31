import {
  GoogleGenerativeAI,
  type ResponseSchema,
} from "@google/generative-ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { withRetry } from "./retry";
import { logChamadaIa } from "@/server/log";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

/**
 * O responseSchema do Gemini NÃO é JSON Schema padrão — é um subconjunto
 * (OpenAPI-ish) que rejeita campos como $schema e additionalProperties.
 * O z.toJSONSchema() do Zod 4 gera JSON Schema padrão completo, então
 * precisamos limpar recursivamente antes de enviar.
 *
 * Remove: $schema, additionalProperties, $ref/$defs, e achata o padrão
 * anyOf:[{...},{type:"null"}] que o Zod gera para campos nullable/optional
 * (o Gemini usa "nullable": true em vez de anyOf).
 */
export function sanitizeForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeForGemini);
  if (schema === null || typeof schema !== "object") return schema;

  const src = schema as Record<string, unknown>;

  // Padrão anyOf/oneOf com um ramo null -> nullable: true no ramo real.
  const union = (src.anyOf ?? src.oneOf) as unknown[] | undefined;
  if (Array.isArray(union)) {
    const hasNull = union.some(
      (u) => (u as Record<string, unknown>)?.type === "null",
    );
    const real = union.find(
      (u) => (u as Record<string, unknown>)?.type !== "null",
    );
    if (real) {
      const cleaned = sanitizeForGemini(real) as Record<string, unknown>;
      if (hasNull) cleaned.nullable = true;
      return cleaned;
    }
  }

  const DROP = new Set([
    "$schema",
    "additionalProperties",
    "$ref",
    "$defs",
    "definitions",
    "anyOf",
    "oneOf",
    "allOf",
    "not",
    "const",
    "default",
  ]);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) {
    if (DROP.has(key)) continue;
    if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(value as Record<string, unknown>)) {
        props[pk] = sanitizeForGemini(pv);
      }
      out[key] = props;
    } else if (key === "items") {
      out[key] = sanitizeForGemini(value);
    } else {
      out[key] = sanitizeForGemini(value);
    }
  }
  return out;
}

/**
 * Modelos por tarefa. Flash para volume/análise; Pro para escrita de alto valor.
 * Centralizado aqui para trocar num lugar só.
 */
export const MODELS = {
  fast: env.GEMINI_MODEL, // gemini-2.5-flash (ou o que estiver no .env)
  pro: "gemini-2.5-pro",
  embedding: "gemini-embedding-001", // 3072 dims (default; sem normalização manual)
} as const;

export { genAI };

/**
 * Chama o Gemini forçando saída JSON que casa com o schema Zod, e revalida a
 * resposta com o mesmo schema (defesa em profundidade).
 *
 * Elimina o cleanAIResponse / parseAIJson / regex-recovery do código antigo:
 * se a resposta divergir do schema, `.parse` lança um ZodError com o campo
 * exato nomeado, em vez de vazar um objeto malformado para a renderização.
 */
export async function generateStructured<T>(opts: {
  model: string;
  schema: z.ZodType<T>;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: opts.model,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      responseMimeType: "application/json",
      // Zod 4 gera JSON Schema padrão; o Gemini aceita só um subconjunto.
      // sanitizeForGemini remove $schema/additionalProperties e achata nullable.
      responseSchema: sanitizeForGemini(
        z.toJSONSchema(opts.schema),
      ) as unknown as ResponseSchema,
    },
  });

  const t0 = Date.now();
  let result: Awaited<ReturnType<typeof model.generateContent>>;
  try {
    result = await withRetry(() => model.generateContent(opts.prompt));
  } catch (e) {
    logChamadaIa({
      operacao: "generateStructured",
      modelo: opts.model,
      ms: Date.now() - t0,
      erro: (e as Error).message,
    });
    throw e;
  }

  const uso = result.response.usageMetadata;
  logChamadaIa({
    operacao: "generateStructured",
    modelo: opts.model,
    ms: Date.now() - t0,
    tokensEntrada: uso?.promptTokenCount,
    tokensSaida: uso?.candidatesTokenCount,
    // Nos modelos 2.5 esse gasto sai do mesmo maxOutputTokens — é o que já
    // truncou resposta antes, então vale medir.
    tokensPensamento: (uso as { thoughtsTokenCount?: number } | undefined)
      ?.thoughtsTokenCount,
    finishReason: result.response.candidates?.[0]?.finishReason,
  });

  /**
   * Os modelos 2.5 gastam tokens de "thinking" ANTES de escrever a resposta, e
   * esse gasto sai do mesmo maxOutputTokens. Quando o orçamento acaba no meio,
   * a API devolve finishReason=MAX_TOKENS e um JSON cortado na metade de uma
   * string — que o JSON.parse rejeita.
   *
   * Sem esta checagem o erro vira "Resposta inválida da IA", culpando o modelo
   * por um limite que é nosso. A mensagem precisa dizer o que realmente houve.
   */
  const finishReason = result.response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    const usados = result.response.usageMetadata;
    console.error(
      `[AI] Resposta truncada por limite de tokens (maxOutputTokens=${opts.maxOutputTokens ?? 8192}).`,
      usados ? `Uso: ${JSON.stringify(usados)}` : "",
    );
    throw new Error(
      "A resposta da IA foi cortada por limite de tamanho. Tente de novo com uma descrição de vaga mais curta.",
    );
  }

  const raw = result.response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[AI] JSON inválido recebido:", raw.slice(0, 500));
    throw new Error("Resposta inválida da IA. Tente novamente.");
  }
  return opts.schema.parse(parsed);
}

/**
 * Chama o Gemini para saída de texto puro (cover letter, resumo, bullet).
 */
export async function generateText(opts: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: opts.model,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
    },
  });
  const t0 = Date.now();
  const result = await withRetry(() => model.generateContent(opts.prompt));
  const uso = result.response.usageMetadata;
  const finishReason = result.response.candidates?.[0]?.finishReason;
  logChamadaIa({
    operacao: "generateText",
    modelo: opts.model,
    ms: Date.now() - t0,
    tokensEntrada: uso?.promptTokenCount,
    tokensSaida: uso?.candidatesTokenCount,
    tokensPensamento: (uso as { thoughtsTokenCount?: number } | undefined)
      ?.thoughtsTokenCount,
    finishReason,
  });

  /**
   * Mesma armadilha do generateStructured, e por muito tempo sem a mesma
   * defesa: quando o orçamento de tokens acaba, a API devolve
   * finishReason=MAX_TOKENS com o texto cortado no meio de uma palavra.
   *
   * Lá o corte vira erro de parse e alguém percebe. Aqui a saída é texto puro,
   * então o trecho truncado voltava como se fosse a resposta completa — o
   * usuário recebia um bullet terminando em "Implementou" e nada indicava
   * falha. Texto cortado é resultado errado, não resultado parcial.
   */
  if (finishReason === "MAX_TOKENS") {
    console.error(
      `[AI] Resposta truncada por limite de tokens (maxOutputTokens=${opts.maxOutputTokens ?? 8192}).`,
      uso ? `Uso: ${JSON.stringify(uso)}` : "",
    );
    throw new Error(
      "A resposta da IA foi cortada por limite de tamanho. Tente de novo com um texto mais curto.",
    );
  }

  return result.response.text().trim();
}
