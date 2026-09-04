import { generateStructured, MODELS } from "@/server/ai/client";
import { ExtractedResumeSchema } from "@/server/ai/schemas";
import {
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  propostaRepo,
} from "@/server/db/repositories";

/**
 * Transforma o texto de um perfil (LinkedIn, CV, o que for) em propostas.
 *
 * Vive fora da rota porque agora tem dois chamadores: o upload de PDF em
 * Configurações e a ferramenta MCP, onde você cola o texto na conversa com o
 * Claude. A extração e — sobretudo — a deduplicação precisam ser as mesmas nos
 * dois; duas implementações divergiriam, e a que divergisse geraria duplicata.
 */

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

export interface ResultadoImport {
  criadas: number;
  ignoradas: number;
  mensagem: string;
}

/**
 * Teto de entrada. O flash aceita ~1M de tokens, então o limite não é do
 * modelo: é para uma página inteira de LinkedIn (com menu, rodapé e "pessoas
 * que você talvez conheça") não virar prompt gigante. 60k cobre um perfil
 * longo com folga — um PDF exportado fica na casa dos 5k.
 */
const MAX_ENTRADA = 60000;

export async function importarPerfilComoPropostas(
  texto: string,
  origemRotulo: string,
): Promise<ResultadoImport> {
  const cortado = texto.length > MAX_ENTRADA;
  const extraido = await generateStructured({
    model: MODELS.fast,
    schema: ExtractedResumeSchema,
    prompt: `Extraia os dados estruturados deste perfil profissional.

NÃO INVENTE NADA: use "" para campo ausente e lista vazia para seção ausente.
Datas no formato YYYY-MM (data_fim vazia significa "atual"). Copie os textos
como estão — não reescreva nem resuma; quem vai revisar é o dono do perfil, e
ele precisa reconhecer o que escreveu.

PERFIL:
${texto.slice(0, MAX_ENTRADA)}`,
  });

  /**
   * O que já existe, para não propor duplicata.
   *
   * Sem isto o import vira ruído: o perfil já tem as experiências, o arquivo
   * traz as mesmas, e a fila nasceria pedindo aprovação para o que já está lá.
   * O que interessa é o que FALTA.
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

  const novas: Array<{ ferramenta: string; argumentos: Record<string, unknown> }> = [];
  let ignoradas = 0;

  for (const e of extraido.experiencias) {
    if (!e.empresa || !e.cargo) continue;
    if (temExp.has(chave(e.empresa + e.cargo))) {
      ignoradas++;
      continue;
    }
    novas.push({
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
    if (temForm.has(chave(f.instituicao + f.curso))) {
      ignoradas++;
      continue;
    }
    novas.push({
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
    if (temCurso.has(chave(c.titulo))) {
      ignoradas++;
      continue;
    }
    novas.push({
      ferramenta: "salvarCurso",
      argumentos: {
        tituloDoCurso: c.titulo,
        emissorInstituicao: c.emissor || null,
      },
    });
  }

  for (const i of extraido.idiomas) {
    if (!i.idioma) continue;
    if (temIdioma.has(chave(i.idioma))) {
      ignoradas++;
      continue;
    }
    novas.push({
      ferramenta: "salvarIdioma",
      argumentos: { idioma: i.idioma, nivelCefr: i.nivel || null },
    });
  }

  /**
   * Sem este aviso o corte é invisível: o texto passa do teto, as últimas
   * experiências não chegam ao modelo, e a mensagem de sucesso não distingue
   * "não tinha mais nada" de "não li o resto".
   */
  const aviso = cortado
    ? " O texto era muito longo e foi lido só até certo ponto — confira se faltou algo do fim do perfil."
    : "";

  if (novas.length === 0) {
    return {
      criadas: 0,
      ignoradas,
      mensagem:
        ignoradas > 0
          ? `Nada de novo: os ${ignoradas} itens do texto já estão no perfil. Nada foi alterado.${aviso}`
          : `Não encontrei experiências, formação ou certificações nesse texto.${aviso}`,
    };
  }

  for (const p of novas) {
    await propostaRepo.criar({
      ferramenta: p.ferramenta,
      argumentos: p.argumentos,
      origem: "mcp",
      origemRotulo,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  const sufixo = ignoradas > 0 ? ` (${ignoradas} já existiam e foram ignorados)` : "";
  return {
    criadas: novas.length,
    ignoradas,
    mensagem: `${novas.length} ${novas.length === 1 ? "item novo" : "itens novos"} aguardando revisão em Propostas${sufixo}. Nada foi gravado ainda.${aviso}`,
  };
}
