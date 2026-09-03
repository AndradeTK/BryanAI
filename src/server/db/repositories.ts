import { eq, desc, sql, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  perfil,
  experiencias,
  formacaoEProjetos,
  educacaoECursos,
  idiomas,
  historicoGeracoes,
  canadaProfile,
  settings,
  jobs,
  applications,
  applicationEvents,
  profileEmbedding,
  answers,
  documents,
  publicProfileTokens,
  propostas,
  anexosReferencia,
  chatConversas,
  chatMensagens,
  type NewAnswer,
  type Answer,
  type NewDocument,
  type NewPublicProfileToken,
  type PublicProfileToken,
  type Proposta,
  type NewProposta,
  type NewAnexoReferencia,
  type ChatConversa,
  type ChatMensagem,
  type NewChatMensagem,
  type Document,
  type NewPerfil,
  type NewExperiencia,
  type NewFormacaoProjeto,
  type NewCurso,
  type NewIdioma,
  type NewHistoricoGeracao,
  type NewCanadaProfile,
  type NewSettings,
  type Settings,
  type NewJob,
  type Job,
  type NewApplication,
  type Application,
} from "./schema";

/** Serializa number[] no literal que o pgvector espera: '[1,2,3]'. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/**
 * Repositórios: acesso a dados por tabela via Drizzle.
 * Substituem os models/*.js do Express. CRUD enxuto; a agregação para a IA
 * fica no curriculoService.
 */

// ---------- Perfil (registro único) ----------
export const perfilRepo = {
  async get() {
    const [row] = await db.select().from(perfil).limit(1);
    return row ?? null;
  },
  async upsert(data: NewPerfil) {
    const existing = await this.get();
    if (existing) {
      const [row] = await db
        .update(perfil)
        .set(data)
        .where(eq(perfil.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(perfil).values(data).returning();
    return row;
  },
};

// ---------- Perfil canadense (registro único) — Fase 2 ----------
export const canadaProfileRepo = {
  async get() {
    const [row] = await db.select().from(canadaProfile).limit(1);
    return row ?? null;
  },
  async upsert(data: NewCanadaProfile) {
    const existing = await this.get();
    if (existing) {
      const [row] = await db
        .update(canadaProfile)
        .set(data)
        .where(eq(canadaProfile.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(canadaProfile).values(data).returning();
    return row;
  },
};

// ---------- Configurações (registro único) ----------
export const settingsRepo = {
  /** Retorna o registro; cria com defaults se ainda não existe. */
  async get(): Promise<Settings> {
    const [row] = await db.select().from(settings).limit(1);
    if (row) return row;
    const [created] = await db.insert(settings).values({}).returning();
    return created;
  },
  async update(data: Partial<NewSettings>): Promise<Settings> {
    const existing = await this.get();
    const [row] = await db
      .update(settings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(settings.id, existing.id))
      .returning();
    return row;
  },
};

// ---------- Experiências ----------
export const experienciaRepo = {
  getAll: () =>
    db
      .select()
      .from(experiencias)
      .orderBy(experiencias.sortOrder, desc(experiencias.id)),
  getById: async (id: number) => {
    const [row] = await db.select().from(experiencias).where(eq(experiencias.id, id));
    return row ?? null;
  },
  create: async (data: NewExperiencia) => {
    const [row] = await db.insert(experiencias).values(data).returning();
    return row;
  },
  update: async (id: number, data: Partial<NewExperiencia>) => {
    const [row] = await db
      .update(experiencias)
      .set(data)
      .where(eq(experiencias.id, id))
      .returning();
    return row;
  },
  remove: (id: number) => db.delete(experiencias).where(eq(experiencias.id, id)),
};

// ---------- Formação e projetos ----------
export const formacaoRepo = {
  getAll: () =>
    db
      .select()
      .from(formacaoEProjetos)
      .orderBy(formacaoEProjetos.sortOrder, desc(formacaoEProjetos.id)),
  getById: async (id: number) => {
    const [row] = await db
      .select()
      .from(formacaoEProjetos)
      .where(eq(formacaoEProjetos.id, id));
    return row ?? null;
  },
  create: async (data: NewFormacaoProjeto) => {
    const [row] = await db.insert(formacaoEProjetos).values(data).returning();
    return row;
  },
  update: async (id: number, data: Partial<NewFormacaoProjeto>) => {
    const [row] = await db
      .update(formacaoEProjetos)
      .set(data)
      .where(eq(formacaoEProjetos.id, id))
      .returning();
    return row;
  },
  remove: (id: number) =>
    db.delete(formacaoEProjetos).where(eq(formacaoEProjetos.id, id)),
};

// ---------- Cursos / certificações ----------
export const cursoRepo = {
  getAll: () => db.select().from(educacaoECursos).orderBy(desc(educacaoECursos.id)),
  getById: async (id: number) => {
    const [row] = await db
      .select()
      .from(educacaoECursos)
      .where(eq(educacaoECursos.id, id));
    return row ?? null;
  },
  create: async (data: NewCurso) => {
    const [row] = await db.insert(educacaoECursos).values(data).returning();
    return row;
  },
  update: async (id: number, data: Partial<NewCurso>) => {
    const [row] = await db
      .update(educacaoECursos)
      .set(data)
      .where(eq(educacaoECursos.id, id))
      .returning();
    return row;
  },
  remove: (id: number) =>
    db.delete(educacaoECursos).where(eq(educacaoECursos.id, id)),
};

// ---------- Idiomas ----------
export const idiomaRepo = {
  getAll: () => db.select().from(idiomas).orderBy(idiomas.id),
  getById: async (id: number) => {
    const [row] = await db.select().from(idiomas).where(eq(idiomas.id, id));
    return row ?? null;
  },
  create: async (data: NewIdioma) => {
    const [row] = await db.insert(idiomas).values(data).returning();
    return row;
  },
  update: async (id: number, data: Partial<NewIdioma>) => {
    const [row] = await db
      .update(idiomas)
      .set(data)
      .where(eq(idiomas.id, id))
      .returning();
    return row;
  },
  remove: (id: number) => db.delete(idiomas).where(eq(idiomas.id, id)),
};

// ---------- Histórico de gerações ----------
export const historicoRepo = {
  /**
   * Totais do histórico, separando o que é análise do que é currículo gerado.
   *
   * As duas coisas gravam na mesma tabela: `/api/jobfit/analyze` cria um
   * registro sem arquivo, `/api/jobfit/generate` cria um com `pdf_path`. O
   * dashboard contava as duas juntas sob o rótulo "Currículos Gerados" — e,
   * como lia só os 10 mais recentes, o número nem era um total.
   */
  counts: async (): Promise<{
    analises: number;
    curriculos: number;
    scoreMedio: number | null;
  }> => {
    const [row] = await db
      .select({
        analises: sql<number>`count(*) FILTER (WHERE ${historicoGeracoes.status} = 'concluido')::int`,
        curriculos: sql<number>`count(*) FILTER (WHERE ${historicoGeracoes.status} = 'concluido' AND ${historicoGeracoes.pdfPath} IS NOT NULL)::int`,
        scoreMedio: sql<number | null>`round(avg(${historicoGeracoes.score}) FILTER (WHERE ${historicoGeracoes.status} = 'concluido'))::int`,
      })
      .from(historicoGeracoes);
    return {
      analises: row?.analises ?? 0,
      curriculos: row?.curriculos ?? 0,
      scoreMedio: row?.scoreMedio ?? null,
    };
  },
  /** Currículos gerados para uma candidatura, do mais recente ao mais antigo. */
  porCandidatura: (applicationId: number) =>
    db
      .select()
      .from(historicoGeracoes)
      .where(eq(historicoGeracoes.applicationId, applicationId))
      .orderBy(desc(historicoGeracoes.id)),
  getRecent: (limit = 10) =>
    db
      .select()
      .from(historicoGeracoes)
      .orderBy(desc(historicoGeracoes.id))
      .limit(limit),
  getAll: () =>
    db.select().from(historicoGeracoes).orderBy(desc(historicoGeracoes.id)),
  remove: (id: number) =>
    db.delete(historicoGeracoes).where(eq(historicoGeracoes.id, id)),
  getById: async (id: number) => {
    const [row] = await db
      .select()
      .from(historicoGeracoes)
      .where(eq(historicoGeracoes.id, id));
    return row ?? null;
  },
  create: async (data: NewHistoricoGeracao) => {
    const [row] = await db.insert(historicoGeracoes).values(data).returning();
    return row;
  },
  update: async (id: number, data: Partial<NewHistoricoGeracao>) => {
    const [row] = await db
      .update(historicoGeracoes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(historicoGeracoes.id, id))
      .returning();
    return row;
  },
  markComplete: (id: number, score: number, pdfPath: string, keywords: string) =>
    historicoRepo.update(id, {
      status: "concluido",
      score,
      pdfPath,
      keywordsFocadas: keywords,
    }),
  markFailed: (id: number) => historicoRepo.update(id, { status: "falha" }),
};

// ---------- Vagas (Fase 4) ----------
export const jobRepo = {
  getAll: () => db.select().from(jobs).orderBy(desc(jobs.id)),
  getById: async (id: number): Promise<Job | null> => {
    const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
    return row ?? null;
  },
  removeMany: (ids: number[]) =>
    ids.length ? db.delete(jobs).where(inArray(jobs.id, ids)) : Promise.resolve(),
  /** Insere ou atualiza por dedup_hash (recaptura da mesma vaga não duplica). */
  upsertByHash: async (
    data: NewJob & { embedding?: number[] | null },
  ): Promise<Job> => {
    const { embedding, ...rest } = data;
    const values = {
      ...rest,
      embedding: embedding
        ? (sql`${toVectorLiteral(embedding)}::vector(3072)` as unknown as number[])
        : null,
    };
    const [row] = await db
      .insert(jobs)
      .values(values)
      .onConflictDoUpdate({
        target: jobs.dedupHash,
        set: {
          titulo: values.titulo,
          descricao: values.descricao,
          empresa: values.empresa,
          localizacao: values.localizacao,
          embedding: values.embedding,
        },
      })
      .returning();
    return row;
  },
  /**
   * Vagas mais próximas do perfil por distância de cosseno (menor = mais parecido).
   * Casta para halfvec(3072) para bater no índice HNSW (vector não indexa >2000 dims).
   */
  nearestToProfile: async (
    profileVec: number[],
    limit = 10,
  ): Promise<Array<Job & { distance: number }>> => {
    const lit = toVectorLiteral(profileVec);
    const rows = await db.execute<Job & { distance: number }>(sql`
      SELECT *,
        (embedding::halfvec(3072)) <=> (${lit}::halfvec(3072)) AS distance
      FROM jobs
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `);
    return rows as unknown as Array<Job & { distance: number }>;
  },
  /** Grava o NOC sugerido pela IA, se ainda não houver. */
  setNoc: (id: number, code: string, confidence: number) =>
    db
      .update(jobs)
      .set({ nocCode: code, nocConfidence: confidence })
      .where(eq(jobs.id, id)),
};

// ---------- Catálogo NOC (busca semântica, #12) ----------
export const nocRepo = {
  count: async (): Promise<number> => {
    const rows = await db.execute<{ n: number }>(
      sql`SELECT COUNT(*)::int AS n FROM noc_codes`,
    );
    return (rows as unknown as { n: number }[])[0]?.n ?? 0;
  },
  /** NOCs mais próximos de um vetor (vaga) por cosseno. */
  nearest: async (
    vec: number[],
    limit = 5,
  ): Promise<Array<{ code: string; title: string; distance: number }>> => {
    const lit = toVectorLiteral(vec);
    const rows = await db.execute(sql`
      SELECT code, title,
        (embedding::halfvec(3072)) <=> (${lit}::halfvec(3072)) AS distance
      FROM noc_codes
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `);
    return rows as unknown as Array<{ code: string; title: string; distance: number }>;
  },
};

// ---------- Candidaturas / kanban (Fase 5) ----------
export const applicationRepo = {
  getBoard: () =>
    db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        status: applications.status,
        score: applications.score,
        analysis: applications.analysis,
        notes: applications.notes,
        appliedAt: applications.appliedAt,
        createdAt: applications.createdAt,
        titulo: jobs.titulo,
        empresa: jobs.empresa,
        descricao: jobs.descricao,
        url: jobs.url,
        localizacao: jobs.localizacao,
        nocCode: jobs.nocCode,
        salaryRaw: jobs.salaryRaw,
        datePosted: jobs.datePosted,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .orderBy(desc(applications.updatedAt)),
  getByJob: async (jobId: number): Promise<Application | null> => {
    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId));
    return row ?? null;
  },
  create: async (data: NewApplication): Promise<Application> => {
    const [row] = await db.insert(applications).values(data).returning();
    await db.insert(applicationEvents).values({
      applicationId: row.id,
      type: "created",
      payload: { status: row.status },
    });
    return row;
  },
  updateStatus: async (id: number, status: Application["status"]) => {
    const [row] = await db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    await db.insert(applicationEvents).values({
      applicationId: id,
      type: "status_changed",
      payload: { status },
    });
    return row;
  },
  /**
   * Atualiza só os campos presentes em `data`.
   *
   * A rota PATCH montava o UPDATE à mão com as duas colunas fixas, então
   * salvar uma nota sem mandar a data de follow-up gravava NULL por cima da
   * data que já existia. Um `.set()` parcial do Drizzle não tem esse problema:
   * o que não está no objeto não entra no SQL.
   */
  updateDetails: async (
    id: number,
    data: Partial<Pick<Application, "notes" | "followUpDate">>,
  ) => {
    if (Object.keys(data).length === 0) return null;
    const [row] = await db
      .update(applications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return row ?? null;
  },
  /**
   * Exclusão de verdade. Os eventos da timeline caem junto (FK em cascata) e
   * o histórico de gerações apenas perde o vínculo (ON DELETE SET NULL) — o
   * PDF gerado continua existindo por si só.
   */
  remove: (id: number) => db.delete(applications).where(eq(applications.id, id)),
  setScore: (id: number, score: number) =>
    db
      .update(applications)
      .set({ score, updatedAt: new Date() })
      .where(eq(applications.id, id)),
  /** Grava score + veredictos canadenses + NOC do batch-score. */
  setAnalysis: (
    id: number,
    score: number,
    analysis: NonNullable<Application["analysis"]>,
  ) =>
    db
      .update(applications)
      .set({ score, analysis, updatedAt: new Date() })
      .where(eq(applications.id, id)),
};

// ---------- Base de aprendizado (respostas de formulários) — Fase 10 ----------
export const answerRepo = {
  getAll: (): Promise<Answer[]> =>
    db.select().from(answers).orderBy(desc(answers.updatedAt)),
  getById: async (id: number): Promise<Answer | null> => {
    const [row] = await db.select().from(answers).where(eq(answers.id, id));
    return row ?? null;
  },
  findByKey: async (key: string): Promise<Answer | null> => {
    const [row] = await db
      .select()
      .from(answers)
      .where(eq(answers.questionKey, key));
    return row ?? null;
  },
  /** Insere ou atualiza a resposta de uma pergunta (por question_key). */
  upsert: async (
    key: string,
    label: string,
    answer: string,
  ): Promise<Answer> => {
    const [row] = await db
      .insert(answers)
      .values({ questionKey: key, questionLabel: label, answer })
      .onConflictDoUpdate({
        target: answers.questionKey,
        set: { questionLabel: label, answer, updatedAt: new Date() },
      })
      .returning();
    return row;
  },
  update: async (id: number, data: Partial<NewAnswer>): Promise<Answer> => {
    const [row] = await db
      .update(answers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(answers.id, id))
      .returning();
    return row;
  },
  remove: (id: number) => db.delete(answers).where(eq(answers.id, id)),
};

// ---------- Documentos anexados pelo usuário (reference letters) — Fase 11 ----------
export const documentRepo = {
  getAll: (): Promise<Document[]> =>
    db.select().from(documents).orderBy(desc(documents.id)),
  getById: async (id: number): Promise<Document | null> => {
    const [row] = await db.select().from(documents).where(eq(documents.id, id));
    return row ?? null;
  },
  /** Documentos marcados para alimentar a IA (só o necessário; sem o binário). */
  getForAi: (): Promise<Pick<Document, "title" | "kind" | "extractedText">[]> =>
    db
      .select({
        title: documents.title,
        kind: documents.kind,
        extractedText: documents.extractedText,
      })
      .from(documents)
      .where(eq(documents.useForAi, true)),
  getByJob: (jobId: number): Promise<Document[]> =>
    db.select().from(documents).where(eq(documents.jobId, jobId)),
  create: async (data: NewDocument): Promise<Document> => {
    const [row] = await db.insert(documents).values(data).returning();
    return row;
  },
  update: async (id: number, data: Partial<NewDocument>): Promise<Document> => {
    const [row] = await db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return row;
  },
  remove: (id: number) => db.delete(documents).where(eq(documents.id, id)),
};

// ---------- Embedding do perfil (registro único) ----------
export const profileEmbeddingRepo = {
  get: async () => {
    const [row] = await db.select().from(profileEmbedding).limit(1);
    return row ?? null;
  },
  upsert: async (embedding: number[], sourceHash: string) => {
    const lit = toVectorLiteral(embedding);
    const existing = await profileEmbeddingRepo.get();
    if (existing) {
      await db.execute(sql`
        UPDATE profile_embedding
        SET embedding = ${lit}::vector(3072), source_hash = ${sourceHash}, updated_at = now()
        WHERE id = ${existing.id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO profile_embedding (embedding, source_hash)
        VALUES (${lit}::vector(3072), ${sourceHash})
      `);
    }
  },
};

// ---------- Tokens de leitura pública do perfil ----------
export const publicTokenRepo = {
  list: (): Promise<PublicProfileToken[]> =>
    db.select().from(publicProfileTokens).orderBy(desc(publicProfileTokens.id)),
  create: async (data: NewPublicProfileToken): Promise<PublicProfileToken> => {
    const [row] = await db.insert(publicProfileTokens).values(data).returning();
    return row;
  },
  remove: (id: number) =>
    db.delete(publicProfileTokens).where(eq(publicProfileTokens.id, id)),
  /** Resolve o hash para o token válido, ou null se não existe ou expirou. */
  findValid: async (tokenHash: string): Promise<PublicProfileToken | null> => {
    const [row] = await db
      .select()
      .from(publicProfileTokens)
      .where(eq(publicProfileTokens.tokenHash, tokenHash));
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    return row;
  },
  /** Registra o uso — dá para ver no painel se um link vazou e está sendo usado. */
  registrarUso: (id: number) =>
    db
      .update(publicProfileTokens)
      .set({ lastUsedAt: new Date(), useCount: sql`${publicProfileTokens.useCount} + 1` })
      .where(eq(publicProfileTokens.id, id)),
};

// ---------- Anexos de referência (experiências / formação) ----------
export const anexoRepo = {
  getBy: (entidade: "experiencia" | "formacao", entidadeId: number) =>
    db
      .select()
      .from(anexosReferencia)
      .where(
        sql`${anexosReferencia.entidade} = ${entidade} AND ${anexosReferencia.entidadeId} = ${entidadeId}`,
      )
      .orderBy(anexosReferencia.id),
  /** Todos de uma vez, para a página montar sem N+1. */
  getAllBy: (entidade: "experiencia" | "formacao") =>
    db
      .select()
      .from(anexosReferencia)
      .where(eq(anexosReferencia.entidade, entidade))
      .orderBy(anexosReferencia.id),
  create: async (data: NewAnexoReferencia) => {
    const [row] = await db.insert(anexosReferencia).values(data).returning();
    return row;
  },
  remove: (id: number) =>
    db.delete(anexosReferencia).where(eq(anexosReferencia.id, id)),
  /**
   * Limpa os anexos de uma entidade apagada. O vínculo é polimórfico, então
   * não há FK para o Postgres cascatear — quem apaga a experiência apaga aqui.
   */
  removeDaEntidade: (entidade: "experiencia" | "formacao", entidadeId: number) =>
    db
      .delete(anexosReferencia)
      .where(
        sql`${anexosReferencia.entidade} = ${entidade} AND ${anexosReferencia.entidadeId} = ${entidadeId}`,
      ),
};

// ---------- Conversas do assistente ----------
export const chatRepo = {
  /** A conversa corrente, criando uma se ainda não existe. */
  conversaAtual: async (): Promise<ChatConversa> => {
    const [existente] = await db
      .select()
      .from(chatConversas)
      .orderBy(desc(chatConversas.id))
      .limit(1);
    if (existente) return existente;
    const [nova] = await db.insert(chatConversas).values({}).returning();
    return nova;
  },
  mensagens: (conversaId: number, limite = 40): Promise<ChatMensagem[]> =>
    db
      .select()
      .from(chatMensagens)
      .where(eq(chatMensagens.conversaId, conversaId))
      .orderBy(desc(chatMensagens.id))
      .limit(limite)
      .then((rows) => rows.reverse()), // do mais antigo para o mais novo
  gravar: (data: NewChatMensagem) => db.insert(chatMensagens).values(data),
  limpar: async (conversaId: number) => {
    await db.delete(chatMensagens).where(eq(chatMensagens.conversaId, conversaId));
    await db.delete(chatConversas).where(eq(chatConversas.id, conversaId));
  },
};

// ---------- Propostas de escrita aguardando aprovação ----------
export const propostaRepo = {
  /**
   * Pendentes ainda válidas, da mais nova para a mais velha.
   *
   * A expiração é filtrada aqui, não marcada por job: uma proposta de sete dias
   * atrás não deve aparecer para aprovação, e um cron para marcá-la seria
   * infraestrutura que não se paga numa VPS compartilhada.
   */
  listarPendentes: (): Promise<Proposta[]> =>
    db
      .select()
      .from(propostas)
      .where(
        sql`${propostas.estado} = 'pendente' AND ${propostas.expiraEm} > now()`,
      )
      .orderBy(desc(propostas.id)),
  /** Só o número, para o badge da navegação em cada render. */
  contarPendentes: async (): Promise<number> => {
    const rows = await db.execute<{ n: number }>(
      sql`SELECT COUNT(*)::int AS n FROM propostas
          WHERE estado = 'pendente' AND expira_em > now()`,
    );
    return (rows as unknown as { n: number }[])[0]?.n ?? 0;
  },
  criar: async (data: NewProposta): Promise<Proposta> => {
    const [row] = await db
      .insert(propostas)
      .values({
        ...data,
        // Sete dias — ver a migration 0018.
        expiraEm:
          data.expiraEm ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    return row;
  },
  /** Uma proposta pendente e válida, ou null. Usada antes de aplicar. */
  pegarPendente: async (id: number): Promise<Proposta | null> => {
    const [row] = await db
      .select()
      .from(propostas)
      .where(
        sql`${propostas.id} = ${id} AND ${propostas.estado} = 'pendente'
            AND ${propostas.expiraEm} > now()`,
      );
    return row ?? null;
  },
  resolver: (
    id: number,
    estado: "aplicada" | "rejeitada",
    resultado?: string,
  ) =>
    db
      .update(propostas)
      .set({ estado, resultado: resultado ?? null, resolvidaEm: new Date() })
      .where(eq(propostas.id, id)),
  /** Rejeitar em massa é seguro; aprovar em massa não é — a assimetria é o desenho. */
  rejeitarTodas: () =>
    db
      .update(propostas)
      .set({ estado: "rejeitada", resolvidaEm: new Date() })
      .where(sql`${propostas.estado} = 'pendente'`),
};

/**
 * Quantas propostas este token criou na última hora.
 *
 * O teto de pendentes cobre o loop rápido; não cobre o lento — um modelo
 * propondo de hora em hora ao longo de um dia nunca encosta nele. A spec do
 * MCP põe o rate limit como obrigação do servidor, e não há proteção do lado
 * do cliente.
 */
export async function propostasNaUltimaHora(origemRotulo: string): Promise<number> {
  const rows = await db.execute<{ n: number }>(
    sql`SELECT COUNT(*)::int AS n FROM propostas
        WHERE origem = 'mcp' AND origem_rotulo = ${origemRotulo}
          AND criada_em > now() - interval '1 hour'`,
  );
  return (rows as unknown as { n: number }[])[0]?.n ?? 0;
}
