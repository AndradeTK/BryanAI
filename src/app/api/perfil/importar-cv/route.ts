import { ok, fail, preflight, handle, guardPanel } from "@/server/http/api";
import { generateStructured, MODELS } from "@/server/ai/client";
import { ExtractedResumeSchema } from "@/server/ai/schemas";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  detectFileType,
} from "@/server/pdf/extract";
import {
  perfilRepo,
  experienciaRepo,
  formacaoRepo,
  idiomaRepo,
} from "@/server/db/repositories";

export function OPTIONS() {
  return preflight();
}

/** "YYYY-MM" ou "YYYY" → date do banco (YYYY-MM-01); vazio → null. */
function toDate(s: string): string | null {
  const t = s?.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  if (/^\d{4}$/.test(t)) return `${t}-01-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

/**
 * Auto-preencher perfil a partir de um CV (#11): extrai o texto do PDF/DOCX,
 * estrutura via IA e CRIA experiências/formação/idiomas + preenche o perfil.
 * O usuário edita depois pelos CRUDs (que agora têm edição inline).
 */
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const form = await request.formData();
    const file = form.get("arquivo");
    if (!(file instanceof File)) return fail("Envie um arquivo PDF ou DOCX.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const tipo = detectFileType(buffer, file.type, file.name);
    if (tipo === "unknown") return fail("Formato não suportado (PDF ou DOCX).");

    let texto: string;
    try {
      texto =
        tipo === "pdf"
          ? await extractTextFromPdf(buffer)
          : await extractTextFromDocx(buffer);
    } catch {
      return fail("Não foi possível ler o arquivo.");
    }
    if (!texto || texto.trim().length < 50)
      return fail("Texto insuficiente no arquivo.");

    const extraido = await generateStructured({
      model: MODELS.fast,
      schema: ExtractedResumeSchema,
      prompt: `Extraia os dados estruturados deste currículo. Não invente nada:
use "" para campos ausentes. Datas no formato YYYY-MM (vazio se atual/desconhecido).

CURRÍCULO:
${texto.slice(0, 12000)}`,
    });

    // Perfil (upsert — registro único)
    const p = extraido.perfil;
    await perfilRepo.upsert({
      nomeCompleto: p.nome_completo || "Importado",
      email: p.email || null,
      telefone: p.telefone || null,
      localizacao: p.localizacao || null,
      linkedin: p.linkedin || null,
      github: p.github || null,
      resumoBase: p.resumo_base || null,
    });

    let criados = 0;
    for (const e of extraido.experiencias) {
      await experienciaRepo.create({
        empresa: e.empresa,
        cargo: e.cargo,
        dataInicio: toDate(e.data_inicio),
        dataFim: toDate(e.data_fim),
        descricaoAtividades: e.descricao || null,
        tagsTecnicas: e.tags.length ? e.tags : null,
      });
      criados++;
    }
    for (const f of extraido.formacao) {
      await formacaoRepo.create({
        tipo: "educacao",
        instituicaoProjeto: f.instituicao,
        tituloCurso: f.curso,
        status: f.status || null,
      });
      criados++;
    }
    for (const i of extraido.idiomas) {
      await idiomaRepo.create({ idioma: i.idioma, nivelCefr: i.nivel || null });
      criados++;
    }

    return ok({ criados, nome: p.nome_completo });
  });
}
