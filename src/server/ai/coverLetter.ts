import { generateText, generateStructured, MODELS } from "./client";
import { contextoDeData } from "./prompts";
import {
  CoverLetterImprovementSchema,
  type CoverLetterImprovement,
} from "./schemas";
import type { Curriculo, Vaga } from "./types";

const IDIOMA_MAP: Record<string, string> = {
  "pt-BR": "português brasileiro",
  en: "inglês",
  fr: "francês",
};

const TOM_DESCRICAO: Record<string, string> = {
  formal: "profissional e formal, porém caloroso",
  entusiasmado: "entusiasmado e energético, mostrando paixão pela oportunidade",
  confiante: "confiante e direto, destacando conquistas mensuráveis",
};

export interface CoverLetterResult {
  coverLetter: string;
  metadata: {
    idioma: string;
    tom: string;
    vaga_titulo: string;
    empresa?: string;
    gerado_em: string;
  };
}

/**
 * Gera uma cover letter personalizada.
 * Lança em erro (não retorna {success:false}) — consistente com analyzer/writer.
 */
export async function generate(
  curriculo: Curriculo,
  vaga: Vaga,
  idioma = "pt-BR",
  tom = "formal",
): Promise<CoverLetterResult> {
  const p = curriculo.perfil;
  const prompt = `${contextoDeData()}

Você é um especialista em redação de Cover Letters para processos seletivos.

DADOS DO CANDIDATO:
Nome: ${p?.nome_completo ?? "Candidato"}
Email: ${p?.email ?? ""}
Telefone: ${p?.telefone ?? ""}
LinkedIn: ${p?.linkedin ?? ""}

RESUMO PROFISSIONAL:
${curriculo.resumo ?? p?.resumo_base ?? "Não informado"}
${
  curriculo.documentos_referencia?.length
    ? `\nCARTAS DE REFERÊNCIA (elogios reais de terceiros — pode citar conquistas\nconcretas destas cartas, sem inventar):\n${curriculo.documentos_referencia
        .map((d) => `— ${d.titulo}:\n${d.texto}`)
        .join("\n\n")}\n`
    : ""
}
VAGA ALVO:
Título: ${vaga.titulo}
Empresa: ${vaga.empresa ?? "Não informada"}
Descrição:
${vaga.descricao}

INSTRUÇÕES:
1. Gere uma Cover Letter em ${IDIOMA_MAP[idioma] ?? "português brasileiro"} com tom ${TOM_DESCRICAO[tom] ?? TOM_DESCRICAO.formal}
2. Máximo 400 palavras
3. Estrutura: saudação, abertura impactante, 2-3 parágrafos conectando experiências aos requisitos, fechamento com call-to-action, despedida
4. Use dados reais do candidato; mencione keywords da vaga naturalmente
5. Evite clichês ("venho por meio desta", "desde já agradeço")

Responda APENAS com a Cover Letter, sem comentários adicionais.`;

  const coverLetter = await generateText({ model: MODELS.fast, prompt });

  return {
    coverLetter,
    metadata: {
      idioma,
      tom,
      vaga_titulo: vaga.titulo,
      empresa: vaga.empresa,
      gerado_em: new Date().toISOString(),
    },
  };
}

/** Gera variações da cover letter em tons diferentes. */
export async function generateVariations(
  curriculo: Curriculo,
  vaga: Vaga,
  count = 3,
): Promise<Array<{ tom: string; texto: string }>> {
  const tons = ["formal", "entusiasmado", "confiante"];
  const variations: Array<{ tom: string; texto: string }> = [];
  for (let i = 0; i < Math.min(count, tons.length); i++) {
    const result = await generate(curriculo, vaga, "pt-BR", tons[i]);
    variations.push({ tom: tons[i], texto: result.coverLetter });
  }
  return variations;
}

/** Analisa e melhora uma cover letter existente (saída estruturada). */
export async function improve(
  coverLetter: string,
  vaga: Vaga,
): Promise<CoverLetterImprovement> {
  const prompt = `${contextoDeData()}

Analise e melhore esta Cover Letter para a vaga descrita.

COVER LETTER ATUAL:
${coverLetter}

VAGA:
Título: ${vaga.titulo}
Descrição: ${vaga.descricao}

Forneça uma versão melhorada (mais impactante e alinhada à vaga), 3-5 pontos de
melhoria específicos (original, sugestão, motivo), e scores original e melhorado
(0-100).`;

  return generateStructured({
    model: MODELS.fast,
    schema: CoverLetterImprovementSchema,
    prompt,
  });
}
