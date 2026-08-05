import "server-only";
import { genAI, MODELS } from "./client";
import { withRetry } from "./retry";
import { contextoDeData } from "./prompts";

/**
 * Transcrição de documento escaneado usando o Gemini como OCR.
 *
 * O pdfjs só extrai texto de PDF que TEM texto. Documento escaneado é imagem —
 * as cartas de recomendação reais devolviam 12 e 28 caracteres, só marcadores
 * de página. O Gemini lê PDF nativamente, inclusive digitalizado, então serve
 * de fallback quando a extração normal não encontra nada.
 *
 * Custo medido numa carta de 1.3MB: 311 tokens de entrada, 351 de saída.
 * O PDF vira páginas de imagem no lado do modelo, o que é bem mais barato do
 * que enviar as páginas renderizadas por nós.
 */

/** Acima disso o `inline_data` estoura o limite de requisição da API. */
const LIMITE_INLINE_MB = 15;

export class DocumentoGrandeDemais extends Error {
  constructor(mb: number) {
    super(
      `O arquivo tem ${mb.toFixed(1)}MB. A leitura por IA aceita até ${LIMITE_INLINE_MB}MB.`,
    );
    this.name = "DocumentoGrandeDemais";
  }
}

/**
 * O prompt é deliberadamente restritivo. Este texto vai alimentar a geração de
 * currículo, então uma "melhoria" do modelo — completar uma frase cortada,
 * inferir um cargo, arredondar uma data — viraria uma afirmação que o candidato
 * teria que defender numa entrevista. Transcrever é copiar, não interpretar.
 */
const PROMPT = `Você é um transcritor de documentos. Sua única tarefa é copiar o texto visível.

REGRAS ABSOLUTAS:
- Transcreva FIELMENTE todo o texto do documento, na ordem em que aparece.
- NÃO resuma, NÃO reescreva, NÃO corrija gramática, NÃO complete frases.
- NÃO acrescente nada que não esteja escrito no documento.
- Se um trecho estiver ilegível, escreva [ilegível] no lugar — nunca adivinhe.
- Preserve quebras de parágrafo. Ignore elementos puramente gráficos (logos,
  carimbos decorativos), mas transcreva texto dentro deles.
- Devolva SOMENTE o texto transcrito, sem comentários seus sobre a tarefa.`;

/**
 * Transcreve um PDF (ou imagem) enviando o arquivo direto ao modelo.
 * Retorna string vazia se o documento não tiver texto algum.
 */
export async function transcreverDocumento(
  buffer: Buffer,
  mimeType = "application/pdf",
): Promise<string> {
  const mb = buffer.length / (1024 * 1024);
  if (mb > LIMITE_INLINE_MB) throw new DocumentoGrandeDemais(mb);

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      // Zero: transcrição não é lugar para criatividade.
      temperature: 0,
      maxOutputTokens: 8192,
    },
  });

  const resultado = await withRetry(() =>
    model.generateContent([
      { inlineData: { mimeType, data: buffer.toString("base64") } },
      { text: `${contextoDeData()}\n\n${PROMPT}` },
    ]),
  );

  const finishReason = resultado.response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    // Documento longo demais para uma resposta: melhor devolver o que veio e
    // avisar do que fingir que a transcrição está completa.
    console.warn("[OCR] Transcrição truncada por limite de tokens.");
  }

  return resultado.response.text().trim();
}
