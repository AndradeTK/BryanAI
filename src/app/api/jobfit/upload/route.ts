import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { analyzeExternalResume } from "@/server/ai/analyzer";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  detectFileType,
} from "@/server/pdf/extract";

export function OPTIONS() {
  return preflight();
}

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const form = await request.formData();
    const titulo = form.get("titulo");
    const descricao = form.get("descricao");
    const file = form.get("arquivo");

    if (!(file instanceof File)) return fail("Arquivo é obrigatório (PDF ou DOCX).");
    if (typeof titulo !== "string" || typeof descricao !== "string" || !titulo || !descricao)
      return fail("Título e descrição da vaga são obrigatórios.");

    // O arquivo vive só em memória — nunca toca o disco.
    const buffer = Buffer.from(await file.arrayBuffer());
    // Detecta o tipo pelos magic bytes (não confia só no mimetype, que pode
    // vir vazio ou errado num upload).
    const tipo = detectFileType(buffer, file.type, file.name);
    if (tipo === "unknown")
      return fail("Formato não suportado. Envie um PDF ou DOCX.");

    let texto: string;
    try {
      texto =
        tipo === "pdf"
          ? await extractTextFromPdf(buffer)
          : await extractTextFromDocx(buffer);
    } catch {
      return fail(
        "Não foi possível ler o arquivo. Verifique se é um PDF ou DOCX válido.",
      );
    }

    if (!texto || texto.trim().length < 50)
      return fail("Não foi possível extrair texto suficiente do arquivo.");

    const analise = await analyzeExternalResume(texto, { titulo, descricao });
    return ok({
      analise,
      arquivoOriginal: file.name,
      caracteresExtraidos: texto.length,
    });
  });
}
