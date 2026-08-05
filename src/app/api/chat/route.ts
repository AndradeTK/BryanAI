import { z } from "zod";
import { ok, fail, handle, guardPanel } from "@/server/http/api";
import {
  conversar,
  MIMES_SUPORTADOS,
  type Anexo,
  type Mensagem,
} from "@/server/chat/agente";
import { detectFileType } from "@/server/pdf/extract";
import { extractTextFromDocx } from "@/server/pdf/extract";

/**
 * Turno de conversa do assistente.
 *
 * Recebe multipart porque a mensagem pode vir com anexos. Só sessão do painel:
 * a extensão não tem nada a fazer aqui, e este endpoint lê o perfil inteiro.
 */
const HistoricoSchema = z
  .array(
    z.object({
      papel: z.enum(["user", "model"]),
      texto: z.string().max(8000),
    }),
  )
  .max(40);

/** Teto por arquivo. Acima disso o inline_data estoura o limite da API. */
const MAX_MB = 12;
const MAX_ANEXOS = 4;

// Leituras encadeadas, anexos e a resposta do modelo passam de 60s no pior caso.
export const maxDuration = 240;

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const form = await request.formData();

    const mensagem = String(form.get("mensagem") ?? "").trim();
    const arquivos = form.getAll("anexos").filter((a): a is File => a instanceof File);

    if (!mensagem && arquivos.length === 0)
      return fail("Escreva uma mensagem ou anexe um arquivo.");
    if (arquivos.length > MAX_ANEXOS)
      return fail(`No máximo ${MAX_ANEXOS} arquivos por mensagem.`);

    let historico: Mensagem[] = [];
    const historicoBruto = form.get("historico");
    if (typeof historicoBruto === "string" && historicoBruto) {
      historico = HistoricoSchema.parse(JSON.parse(historicoBruto)) as Mensagem[];
    }

    const anexos: Anexo[] = [];
    for (const arquivo of arquivos) {
      const mb = arquivo.size / (1024 * 1024);
      if (mb > MAX_MB)
        return fail(`"${arquivo.name}" tem ${mb.toFixed(1)}MB — o limite é ${MAX_MB}MB.`);

      const buffer = Buffer.from(await arquivo.arrayBuffer());
      const tipo = detectFileType(buffer, arquivo.type, arquivo.name);

      if (tipo === "docx") {
        // O Gemini não abre DOCX; extrai aqui e manda como texto.
        try {
          const texto = await extractTextFromDocx(buffer);
          anexos.push({
            nome: arquivo.name,
            mimeType: arquivo.type,
            dados: texto.slice(0, 20000),
            ehTexto: true,
          });
        } catch {
          return fail(`Não consegui ler "${arquivo.name}".`);
        }
        continue;
      }

      const mime = tipo === "pdf" ? "application/pdf" : arquivo.type;
      if (!MIMES_SUPORTADOS.includes(mime)) {
        return fail(
          `"${arquivo.name}" não é um formato que eu consiga ler. Envie PDF, DOCX ou imagem (PNG, JPG, WEBP).`,
        );
      }

      anexos.push({
        nome: arquivo.name,
        mimeType: mime,
        dados: buffer.toString("base64"),
      });
    }

    const resposta = await conversar(historico, mensagem || "(veja o anexo)", anexos);
    return ok(resposta);
  });
}
