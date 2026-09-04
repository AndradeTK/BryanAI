import { ok, fail, handle, guardPanel } from "@/server/http/api";
import { detectFileType } from "@/server/pdf/extract";
import { extrairTexto } from "@/server/documentos/texto";
import { importarPerfilComoPropostas } from "@/server/perfil/importarTexto";

/**
 * Importa o perfil do LinkedIn (PDF) como PROPOSTAS, não como escrita.
 *
 * O importador de CV que já existe grava direto, e para o primeiro
 * preenchimento isso está certo — o perfil estava vazio. Aqui é outro caso:
 * você já tem experiências cadastradas e refinadas, e o LinkedIn traz as mesmas
 * com texto diferente e geralmente mais pobre. Gravar direto duplicaria tudo.
 *
 * A extração e a deduplicação vivem em `importarTexto` porque a ferramenta MCP
 * usa as mesmas — divergir entre os dois caminhos geraria duplicata num deles.
 */
export const maxDuration = 240;

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const form = await request.formData();
    const file = form.get("arquivo");
    if (!(file instanceof File)) return fail("Envie o PDF do seu perfil.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const tipo = detectFileType(buffer, file.type, file.name);
    if (tipo === "unknown") return fail("Formato não suportado (PDF ou DOCX).");

    const { texto, motivo } = await extrairTexto(buffer, tipo);
    if (!texto) return fail(motivo ?? "Não foi possível ler o arquivo.");

    return ok(await importarPerfilComoPropostas(texto, "Importação do LinkedIn"));
  });
}
