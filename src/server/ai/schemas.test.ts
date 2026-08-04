import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  JobFitAnalysisSchema,
  QuickAnalysisSchema,
  ResumeSchema,
  SkillsGapSchema,
  BulletSchema,
} from "./schemas";

describe("CanadianResume — proteção jurídica por ausência de campos", () => {
  it("o schema do CV NÃO tem campos proibidos (foto, idade, nacionalidade, SIN)", () => {
    const shape = ResumeSchema.shape;
    for (const proibido of [
      "photo",
      "foto",
      "age",
      "idade",
      "date_of_birth",
      "marital_status",
      "estado_civil",
      "nationality",
      "nacionalidade",
      "gender",
      "sin",
    ]) {
      expect(shape).not.toHaveProperty(proibido);
    }
  });

  it("BulletSchema exige metric_grounded (anti-alucinação)", () => {
    // bullet sem métrica: grounded=false + placeholder
    expect(
      BulletSchema.safeParse({
        text: "Desenvolvi APIs",
        metric_grounded: false,
        metric_placeholder: "[quantificar]",
      }).success,
    ).toBe(true);
    // bullet fundamentado: grounded=true + placeholder null
    expect(
      BulletSchema.safeParse({
        text: "Reduzi latência em 40%",
        metric_grounded: true,
        metric_placeholder: null,
      }).success,
    ).toBe(true);
    // falta metric_grounded → rejeita
    expect(BulletSchema.safeParse({ text: "x" }).success).toBe(false);
  });

  it("formação tem canadian_equivalency (ECA)", () => {
    expect(ResumeSchema.shape.formacao.element.shape).toHaveProperty(
      "canadian_equivalency",
    );
  });
});

describe("schemas de IA — structured output", () => {
  it("z.toJSONSchema gera schema para cada contrato (o que vai ao Gemini)", () => {
    for (const s of [
      JobFitAnalysisSchema,
      QuickAnalysisSchema,
      ResumeSchema,
      SkillsGapSchema,
    ]) {
      const js = z.toJSONSchema(s as z.ZodType) as { type?: string };
      expect(js.type).toBe("object");
    }
  });

  it("QuickAnalysis aceita JSON válido", () => {
    expect(
      QuickAnalysisSchema.safeParse({ score: 72, resumo: "bom fit", fit: "Alto" })
        .success,
    ).toBe(true);
  });

  it("QuickAnalysis REJEITA JSON incompleto e nomeia o campo faltante", () => {
    const r = QuickAnalysisSchema.safeParse({ score: 72, resumo: "truncada" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("fit"))).toBe(true);
    }
  });

  it("JobFit rejeita score fora do range", () => {
    expect(JobFitAnalysisSchema.safeParse({ score: 150 }).success).toBe(false);
  });

  it("QuickAnalysis rejeita enum inválido", () => {
    expect(
      QuickAnalysisSchema.safeParse({ score: 50, resumo: "x", fit: "Ótimo" })
        .success,
    ).toBe(false);
  });
});
