import { describe, it, expect } from "vitest";
import { z } from "zod";
import { sanitizeForGemini } from "./client";
import { JobFitAnalysisSchema, SkillsGapSchema } from "./schemas";

/** Coleta chaves que o Gemini rejeita, recursivamente. */
function findBadKeys(o: unknown, path = ""): string[] {
  const bad: string[] = [];
  if (Array.isArray(o)) {
    o.forEach((x, i) => bad.push(...findBadKeys(x, `${path}[${i}]`)));
  } else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (["$schema", "additionalProperties", "anyOf", "oneOf", "$ref"].includes(k)) {
        bad.push(`${path}.${k}`);
      }
      bad.push(...findBadKeys(v, `${path}.${k}`));
    }
  }
  return bad;
}

describe("sanitizeForGemini — schema compatível com o responseSchema do Gemini", () => {
  it("remove todos os campos que o Gemini rejeita (bug do $schema)", () => {
    for (const schema of [JobFitAnalysisSchema, SkillsGapSchema]) {
      const raw = z.toJSONSchema(schema as z.ZodType);
      expect(findBadKeys(raw).length).toBeGreaterThan(0); // o raw TEM campos ruins
      const clean = sanitizeForGemini(raw);
      expect(findBadKeys(clean)).toEqual([]); // o limpo NÃO tem
    }
  });

  it("preserva a estrutura (type object + properties)", () => {
    const clean = sanitizeForGemini(
      z.toJSONSchema(JobFitAnalysisSchema),
    ) as Record<string, unknown>;
    expect(clean.type).toBe("object");
    expect(clean.properties).toBeTruthy();
  });

  it("achata nullable (anyOf com null vira nullable:true)", () => {
    const schema = z.object({ noc: z.string().nullable() });
    const clean = sanitizeForGemini(z.toJSONSchema(schema)) as {
      properties: { noc: { nullable?: boolean; anyOf?: unknown } };
    };
    expect(clean.properties.noc.anyOf).toBeUndefined();
    expect(clean.properties.noc.nullable).toBe(true);
  });
});
