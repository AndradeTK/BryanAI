import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { analyzeExternalResume } from "@/server/ai/analyzer";
import { detectFileType } from "@/server/pdf/extract";
import { extrairTexto } from "@/server/documentos/texto";

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

    // Extração direta e, quando o PDF é escaneado, leitura por IA. Um currículo
    // digitalizado antes parava aqui com "não foi possível extrair texto".
    const { texto, viaOcr, motivo } = await extrairTexto(buffer, tipo);
    if (!texto) return fail(motivo ?? "Não foi possível ler o arquivo.");

    const analise = await analyzeExternalResume(texto, { titulo, descricao });
    return ok({
      analise,
      arquivoOriginal: file.name,
      caracteresExtraidos: texto.length,
      textoViaOcr: viaOcr,
    });
  });
}
