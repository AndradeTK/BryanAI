import { ok, fail, handle, guardPanel } from "@/server/http/api";
import { generateStructured, MODELS } from "@/server/ai/client";
import { ExtractedResumeSchema } from "@/server/ai/schemas";
import { detectFileType } from "@/server/pdf/extract";
import { extrairTexto } from "@/server/documentos/texto";
import {
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  propostaRepo,
} from "@/server/db/repositories";

/**
 * Importa o perfil do LinkedIn como PROPOSTAS, não como escrita.
 *
 * O importador de CV que já existe grava direto, e para o primeiro
 * preenchimento isso está certo — o perfil estava vazio. Aqui é outro caso:
 * você já tem experiências cadastradas e refinadas, e o LinkedIn traz as mesmas
 * com texto diferente e geralmente mais pobre. Gravar direto duplicaria tudo e
 * sobrescreveria o que você já melhorou.
 *
 * Então cada item vira uma proposta, com o antes → depois que a fila já mostra.
 * Você aprova o que acrescenta e rejeita o que piora.
 *
 * De onde tirar o arquivo: no seu perfil do LinkedIn, More → Save to PDF. Sai
 * na hora. O arquivo de dados (Settings → Data Privacy) é mais completo, mas
 * vem em CSV e demora — fica para depois, se valer a pena.
 */
export const maxDuration = 240;

/** "YYYY-MM" ou "YYYY" → date do banco. Vazio → null. */
function toDate(s: string): string | null {
  const t = s?.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  if (/^\d{4}$/.test(t)) return `${t}-01-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

/** Compara ignorando acento, caixa e pontuação — "Tio Adriano" vs "TIO ADRIANO". */
export function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\u0300-\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

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

    const extraido = await generateStructured({
      model: MODELS.fast,
      schema: ExtractedResumeSchema,
      prompt: `Extraia os dados estruturados deste perfil do LinkedIn exportado.

NÃO INVENTE NADA: use "" para campo ausente e lista vazia para seção ausente.
Datas no formato YYYY-MM (data_fim vazia significa "atual"). Copie os textos
como estão no documento — não reescreva nem resuma; quem vai revisar é o dono
do perfil, e ele precisa reconhecer o que escreveu.

PERFIL:
${texto.slice(0, 14000)}`,
    });

    /**
     * O que já existe, para não propor duplicata.
     *
     * Sem isto o import viraria ruído: você tem 4 experiências, o LinkedIn traz
     * as mesmas 4, e a fila nasceria com 4 propostas para aprovar coisas que
     * já estão lá. O que interessa é o que FALTA.
     */
    const [exps, forms, cursos, idis] = await Promise.all([
      experienciaRepo.getAll(),
      formacaoRepo.getAll(),
      cursoRepo.getAll(),
      idiomaRepo.getAll(),
    ]);
    const temExp = new Set(exps.map((e) => chave(e.empresa + e.cargo)));
    const temForm = new Set(
      forms.map((f) => chave((f.instituicaoProjeto ?? "") + (f.tituloCurso ?? ""))),
    );
    const temCurso = new Set(cursos.map((c) => chave(c.tituloDoCurso ?? "")));
    const temIdioma = new Set(idis.map((i) => chave(i.idioma)));

    const propostas: Array<{ ferramenta: string; argumentos: Record<string, unknown> }> = [];

    for (const e of extraido.experiencias) {
      if (!e.empresa || !e.cargo) continue;
      if (temExp.has(chave(e.empresa + e.cargo))) continue;
      propostas.push({
        ferramenta: "salvarExperiencia",
        argumentos: {
          empresa: e.empresa,
          cargo: e.cargo,
          dataInicio: toDate(e.data_inicio),
          dataFim: toDate(e.data_fim),
          descricaoAtividades: e.descricao || null,
          tagsTecnicas: e.tags.length ? e.tags.join(", ") : null,
        },
      });
    }

    for (const f of extraido.formacao) {
      if (!f.instituicao && !f.curso) continue;
      if (temForm.has(chave(f.instituicao + f.curso))) continue;
      propostas.push({
        ferramenta: "salvarFormacao",
        argumentos: {
          tipo: "educacao",
          instituicaoProjeto: f.instituicao,
          tituloCurso: f.curso || null,
          status: f.status || null,
        },
      });
    }

    for (const c of extraido.certificacoes) {
      if (!c.titulo) continue;
      if (temCurso.has(chave(c.titulo))) continue;
      propostas.push({
        ferramenta: "salvarCurso",
        argumentos: {
          tituloDoCurso: c.titulo,
          emissorInstituicao: c.emissor || null,
        },
      });
    }

    for (const i of extraido.idiomas) {
      if (!i.idioma) continue;
      if (temIdioma.has(chave(i.idioma))) continue;
      propostas.push({
        ferramenta: "salvarIdioma",
        argumentos: { idioma: i.idioma, nivelCefr: i.nivel || null },
      });
    }

    if (propostas.length === 0) {
      return ok({
        criadas: 0,
        mensagem:
          "Nada de novo: tudo o que o arquivo traz já está no seu perfil. O que existe aqui não foi tocado.",
      });
    }

    for (const p of propostas) {
      await propostaRepo.criar({
        ferramenta: p.ferramenta,
        argumentos: p.argumentos,
        origem: "mcp",
        origemRotulo: "Importação do LinkedIn",
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return ok({
      criadas: propostas.length,
      mensagem: `${propostas.length} ${propostas.length === 1 ? "item novo" : "itens novos"} aguardando sua revisão em Propostas. Nada foi gravado ainda.`,
    });
  });
}
