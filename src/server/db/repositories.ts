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
  type NewAnswer,
  type Answer,
  type NewDocument,
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
