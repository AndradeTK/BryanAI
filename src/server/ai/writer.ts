import { generateStructured, MODELS } from "./client";
import { ResumeSchema, type Resume } from "./schemas";
import { WRITER_SYSTEM_PROMPT, IDIOMA_INSTRUCOES, contextoDeData } from "./prompts";
import type { Curriculo, Vaga } from "./types";
import type { JobFitAnalysis } from "./schemas";

/**
 * Reescreve o currículo completo otimizado para a vaga, traduzido para o idioma.
 * Usa o modelo Pro (escrita de alto valor).
 */
export async function rewriteResume(
  curriculo: Curriculo,
  vaga: Vaga,
  analise: JobFitAnalysis | null = null,
  idioma = "pt-BR",
): Promise<Resume> {
  const lang = IDIOMA_INSTRUCOES[idioma] ?? IDIOMA_INSTRUCOES["pt-BR"];
  const keywordsToFocus = analise?.keywords_match?.ausentes?.join(", ") ?? "";
  const experienciasDestacar = analise?.experiencias_destacar?.join(", ") ?? "";

  const prompt = `${contextoDeData()}

${WRITER_SYSTEM_PROMPT}

IDIOMA OBRIGATÓRIO: ${lang.instrucao}
${lang.verbos}
${lang.periodo}
${lang.extra}

DADOS COMPLETOS DO CANDIDATO (traduza todos os campos para o idioma solicitado):
${JSON.stringify(curriculo, null, 2)}
${
  curriculo.documentos_referencia?.length
    ? `\nCARTAS DE REFERÊNCIA DO CANDIDATO (campo documentos_referencia acima): use\nelogios e conquistas REAIS citados por terceiros para reforçar bullets e o\nresumo — mas SÓ o que está escrito; não invente números nem atribua frases que\nnão constam nas cartas.`
    : ""
}

VAGA ALVO:
Título: ${vaga.titulo}
Descrição: ${vaga.descricao}

${keywordsToFocus ? `KEYWORDS IMPORTANTES PARA INCLUIR: ${keywordsToFocus}` : ""}
${experienciasDestacar ? `EXPERIÊNCIAS PARA DESTACAR: ${experienciasDestacar}` : ""}

TAREFA: Reescreva o currículo COMPLETO otimizado para esta vaga, em ordem
cronológica reversa (experiências atuais no topo, usando "${lang.present}" para
empregos atuais). Retorne o JSON estruturado.

CADA bullet é um objeto { text, metric_grounded, metric_placeholder }:
- text: o bullet seguindo a fórmula [Verbo] + [Tarefa] + [Resultado]
- metric_grounded: true SÓ se a métrica (número/%) veio dos dados reais do
  candidato; false se não há métrica real
- metric_placeholder: null quando grounded; senão um marcador como
  "[quantificar: ex. % de melhoria]". NUNCA invente números.

Para CADA formação, preencha canadian_equivalency com a equivalência do diploma
quando o candidato tiver ECA (${curriculo.canada?.eca_status ?? "none"}${curriculo.canada?.eca_equivalency ? `: ${curriculo.canada.eca_equivalency}` : ""}); use null se não aplica.

CAMPOS OPCIONAIS (link do projeto, certificacao_exame, etc.): se o dado NÃO
existir, OMITA o campo ou use null/string vazia. NUNCA escreva "N/A", "Not
Applicable", "Não informado" ou similar — deixe realmente vazio.`;

  return generateStructured({
    model: MODELS.pro,
    schema: ResumeSchema,
    prompt,
    temperature: 0.7,
  });
}
