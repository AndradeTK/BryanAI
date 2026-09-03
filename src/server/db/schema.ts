import {
  pgTable,
  serial,
  varchar,
  text,
  date,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  vector,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * Schema Postgres (Drizzle) — as 6 tabelas atuais, com os tipos corrigidos em
 * relação ao MySQL original:
 *   - datas VARCHAR -> DATE (data_fim nullable = "atual")
 *   - tags_tecnicas CSV em TEXT -> text[] (array nativo)
 *   - destaque ENUM('Sim','Não') -> boolean
 *   - 3 timestamps redundantes -> um par created_at/updated_at
 *   - status como enum PG nativo
 */

// 1. Perfil (registro único)
export const perfil = pgTable("perfil", {
  id: serial("id").primaryKey(),
  nomeCompleto: varchar("nome_completo", { length: 255 }).notNull(),
  email: varchar("email", { length: 150 }),
  telefone: varchar("telefone", { length: 20 }),
  localizacao: varchar("localizacao", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  github: varchar("github", { length: 255 }),
  resumoBase: text("resumo_base"),
  dataNascimento: date("data_nascimento"),
});

// 2. Experiências
export const experiencias = pgTable("experiencias", {
  id: serial("id").primaryKey(),
  empresa: varchar("empresa", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 150 }).notNull(),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"), // null = emprego atual
  descricaoAtividades: text("descricao_atividades"),
  principaisConquistas: text("principais_conquistas"),
  categoria: varchar("categoria", { length: 100 }),
  tagsTecnicas: text("tags_tecnicas").array(), // era CSV; agora array
  sortOrder: integer("sort_order").notNull().default(0),
});

// 3. Formação e projetos
export const tipoFormacaoEnum = pgEnum("tipo_formacao", [
  "educacao",
  "projeto",
  // Monitoria, embaixador estudantil, voluntariado, representação. Vale como
  // experiência canadense quando feita aqui, e é soft skill demonstrada.
  "atividade",
]);

export const formacaoEProjetos = pgTable("formacao_e_projetos", {
  id: serial("id").primaryKey(),
  tipo: tipoFormacaoEnum("tipo").notNull(),
  instituicaoProjeto: varchar("instituicao_projeto", { length: 255 }),
  tituloCurso: varchar("titulo_curso", { length: 255 }),
  status: varchar("status", { length: 100 }),
  descricaoDetalhada: text("descricao_detalhada"),
  link: varchar("link", { length: 1000 }), // repo/demo do projeto ou diploma
  /** Papel exercido na atividade: "Embaixador", "Monitor", "Voluntário". */
  papel: varchar("papel", { length: 150 }),
  /** Texto livre — o currículo imprime, não calcula. Fim null = em andamento. */
  periodoInicio: varchar("periodo_inicio", { length: 20 }),
  periodoFim: varchar("periodo_fim", { length: 20 }),
  /**
   * Atividade feita no Canadá. Separado de canada_profile.canadian_exp_months
   * de propósito: voluntariado não é emprego, e somar os dois infla o número
   * que o próprio usuário usa para decidir se concorre a uma vaga.
   */
  noCanada: boolean("no_canada").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// 4. Educação extra e cursos (certificações)
export const educacaoECursos = pgTable("educacao_e_cursos", {
  id: serial("id").primaryKey(),
  emissorInstituicao: varchar("emissor_instituicao", { length: 255 }),
  tituloDoCurso: varchar("titulo_do_curso", { length: 255 }),
  descricao: text("descricao"),
  destaque: boolean("destaque").default(false), // era ENUM Sim/Não
  link: varchar("link", { length: 1000 }), // URL do certificado
});

// 5. Idiomas
export const idiomas = pgTable("idiomas", {
  id: serial("id").primaryKey(),
  idioma: varchar("idioma", { length: 100 }).notNull(),
  nivelCefr: varchar("nivel_cefr", { length: 100 }),
  certificacaoExame: varchar("certificacao_exame", { length: 255 }),
  historicoDeEscolas: text("historico_de_escolas"),
  link: varchar("link", { length: 1000 }), // URL do certificado de idioma
});

// 6. Histórico de gerações
export const statusGeracaoEnum = pgEnum("status_geracao", [
  "processando",
  "concluido",
  "falha",
]);

export const historicoGeracoes = pgTable("historico_geracoes", {
  id: serial("id").primaryKey(),
  vagaTitulo: varchar("vaga_titulo", { length: 255 }),
  /**
   * Candidatura para a qual este currículo foi gerado, quando houver.
   * Null para geração avulsa pela tela de Job Fit — nem toda análise nasce de
   * uma vaga no kanban. É o que responde "qual versão eu mandei para essa
   * vaga?" na véspera da entrevista.
   */
  applicationId: integer("application_id"),
  score: integer("score"),
  keywordsFocadas: text("keywords_focadas"),
  status: statusGeracaoEnum("status").default("processando"),
  pdfPath: varchar("pdf_path", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 7. Perfil canadense (registro único) — Fase 2
export const workAuthEnum = pgEnum("work_authorization", [
  "citizen",
  "pr",
  "pgwp",
  "owp",
  "spouse_owp",
  "study_permit",
  "needs_lmia",
  "needs_sponsorship",
]);

export const ecaStatusEnum = pgEnum("eca_status", [
  "none",
  "in_progress",
  "wes",
  "ices",
  "iqas",
  "ces",
  "icas",
]);

export const licenseStatusEnum = pgEnum("license_status", [
  "na",
  "not_started",
  "in_progress",
  "licensed",
]);

export const languageTestEnum = pgEnum("language_test", [
  "none",
  "ielts",
  "celpip",
  "tef",
  "tcf",
]);

export const canadaProfile = pgTable("canada_profile", {
  id: serial("id").primaryKey(),
  workAuthorization: workAuthEnum("work_authorization")
    .notNull()
    .default("needs_sponsorship"),
  authorizedProvinces: text("authorized_provinces").array(),
  preferredProvinces: text("preferred_provinces").array(),
  clbEnglish: integer("clb_english"), // 1-12, null se não avaliado
  nclcFrench: integer("nclc_french"),
  languageTest: languageTestEnum("language_test").default("none"),
  ecaStatus: ecaStatusEnum("eca_status").default("none"),
  ecaEquivalency: text("eca_equivalency"), // "Bachelor's — WES-assessed"
  regulatedProfession: varchar("regulated_profession", { length: 100 }), // 'P.Eng', 'CPA', null
  licenseStatus: licenseStatusEnum("license_status").default("na"),
  canadianExpMonths: integer("canadian_exp_months").default(0),
  // Contato canadense — usado no CV en-CA/fr-CA no lugar do endereço/telefone BR.
  canadianCity: varchar("canadian_city", { length: 255 }), // "Toronto, ON"
  canadianPhone: varchar("canadian_phone", { length: 30 }), // "+1 ..."
});

// 8. Configurações do usuário (registro único)
// Portado do userSettingsService.js (que gravava um JSON em disco).
export const DEFAULT_SECTIONS_ORDER = [
  "summary",
  "experience",
  "skills",
  "education",
  "certifications",
  "languages",
  "projects",
  "leadership",
] as const;

export interface Preferencias {
  incluirProjetos: boolean;
  limiteCertificacoes: number;
  formatoDataExperiencia: string;
  mostrarPortfolio: boolean;
  mostrarGithub: boolean;
}

export const DEFAULT_PREFERENCIAS: Preferencias = {
  incluirProjetos: true,
  limiteCertificacoes: 6,
  formatoDataExperiencia: "MMM YYYY",
  mostrarPortfolio: true,
  mostrarGithub: true,
};

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  templatePadrao: varchar("template_padrao", { length: 50 })
    .notNull()
    .default("minimalista"),
  idiomaDefault: varchar("idioma_default", { length: 10 })
    .notNull()
    .default("pt-BR"),
  darkMode: boolean("dark_mode").notNull().default(false),
  sectionsOrder: jsonb("sections_order")
    .$type<string[]>()
    .notNull()
    .default([...DEFAULT_SECTIONS_ORDER]),
  preferencias: jsonb("preferencias")
    .$type<Preferencias>()
    .notNull()
    .default(DEFAULT_PREFERENCIAS),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Fase 4 — Job tracker + matching semântico (pgvector)
// ============================================================
// Requer a extensão `vector` (criada na migration 0003, antes das tabelas).

// 9. Vagas capturadas (via extensão/JSON-LD ou entrada manual)
// NOTA pgvector: HNSW no tipo `vector` é limitado a 2000 dims. Como usamos 3072,
// o índice HNSW é criado à mão na migration 0003 via cast para `halfvec(3072)`
// (limite 4000, metade do storage). A coluna continua `vector(3072)` para
// inserir/ler normalmente; só o ÍNDICE e as queries de distância castam.
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 300 }).notNull(),
  empresa: varchar("empresa", { length: 255 }),
  descricao: text("descricao").notNull(),
  localizacao: varchar("localizacao", { length: 255 }),
  url: varchar("url", { length: 1000 }),
  source: varchar("source", { length: 50 }).notNull().default("manual"),
  nocCode: varchar("noc_code", { length: 10 }), // preenchível depois
  nocConfidence: real("noc_confidence"),
  salaryRaw: varchar("salary_raw", { length: 255 }),
  datePosted: date("date_posted"),
  // sha256(lower(empresa|titulo|cidade)) — dedup de recapturas
  dedupHash: varchar("dedup_hash", { length: 64 }).notNull().unique(),
  embedding: vector("embedding", { dimensions: 3072 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 9b. Catálogo NOC 2021 (516 unit groups) — busca semântica vaga→NOC (#12).
// Mesmo padrão de embedding/HNSW halfvec das vagas (índice criado à mão na
// migration).
export const nocCodes = pgTable("noc_codes", {
  code: varchar("code", { length: 10 }).primaryKey(), // 5 dígitos
  title: varchar("title", { length: 500 }).notNull(),
  definition: text("definition"),
  teer: varchar("teer", { length: 2 }), // dígito TEER (do código)
  embedding: vector("embedding", { dimensions: 3072 }),
});

// 10. Candidaturas (o kanban)
export const applicationStatusEnum = pgEnum("application_status", [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
  "archived",
]);

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull().default("saved"),
  score: integer("score"), // cache do último jobfit
  // Veredictos canadenses + NOC do último batch-score (não só o score).
  analysis: jsonb("analysis").$type<{
    work_auth_verdict?: string;
    language_verdict?: string;
    regulated_gap?: string | null;
    noc_suggestion?: { code: string; confidence: number } | null;
  }>(),
  notes: text("notes"),
  appliedAt: date("applied_at"),
  followUpDate: date("follow_up_date"), // lembrete (#9)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 11. Timeline de eventos da candidatura
export const applicationEvents = pgTable("application_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 12. Embedding do perfil (registro único; cacheado para o ranking)
export const profileEmbedding = pgTable("profile_embedding", {
  id: serial("id").primaryKey(),
  embedding: vector("embedding", { dimensions: 3072 }).notNull(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 13. Base de aprendizado — respostas reutilizáveis de formulários de aplicação
// (Fase 10). Quando um formulário Easy Apply pede um dado que não temos, o
// usuário responde uma vez; salvamos por `question_key` (slug normalizado) e
// reusamos nas próximas vagas. Um registro por pergunta.
export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  questionKey: varchar("question_key", { length: 200 }).notNull().unique(),
  questionLabel: text("question_label").notNull(),
  answer: text("answer").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 14. Documentos anexados pelo usuário (reference letters, portfólios, etc.) —
// Fase 11. Diferente da tabela `historico_geracoes` (CVs QUE O APP GERA): aqui é
// upload do usuário. O arquivo em si vive no volume `generated` (reusa o storage
// e o route /api/arquivos); guardamos o texto extraído do PDF para a IA usar as
// conquistas ao gerar CV/carta, e um vínculo opcional a uma vaga do kanban.
export const documentKindEnum = pgEnum("document_kind", [
  "reference_letter",
  "other",
]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  kind: documentKindEnum("kind").notNull().default("reference_letter"),
  title: varchar("title", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 500 }).notNull(), // no volume generated
  extractedText: text("extracted_text"), // texto do PDF (para a IA)
  /**
   * true quando o texto veio da leitura por IA — documento escaneado, que o
   * pdfjs não consegue ler. Transcrição é reprodução, não cópia: fica marcado
   * para o usuário poder conferir antes que alimente a geração de currículo.
   */
  textoViaOcr: boolean("texto_via_ocr").notNull().default(false),
  useForAi: boolean("use_for_ai").notNull().default(true),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// Autenticação
// ============================================================
// A ferramenta é single-user por desenho — as 14 tabelas acima não têm user_id
// e nem precisam. O login existe para que a instância exposta na internet não
// seja um painel aberto com o currículo, o histórico de candidaturas e a cota
// da API do Gemini de quem passar pela URL.

// 15. Usuários. Sem rota de cadastro: a conta nasce do `npm run user:create`.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }),
  // scrypt: "scrypt$N$r$p$salt_b64$hash_b64" — formato próprio, ver auth/password.ts
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

// 16. Sessões. Token opaco em vez de JWT: dá revogação imediata (logout de
// verdade, inclusive "encerrar todas as sessões") e não depende de o segredo
// nunca vazar. O cookie carrega o token puro; aqui guardamos só o SHA-256 dele,
// então um dump do banco não permite se passar por ninguém.
export const sessions = pgTable("sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: varchar("user_agent", { length: 500 }),
  ip: varchar("ip", { length: 45 }), // cabe IPv6
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 16b. Tokens de leitura pública do perfil. Mesmo princípio das sessões — só o
// SHA-256 fica guardado — porque o caso de uso é colar um link numa IA de
// terceiro, e um link que vaza não pode virar acesso permanente aos dados de
// contato. Vive no banco (e não numa variável de ambiente) para revogar sem
// redeploy.
export const publicProfileTokens = pgTable("public_profile_tokens", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 100 }),
  /** Sem contato por padrão: o link é para a IA ler o histórico, não o telefone. */
  redactContact: boolean("redact_contact").notNull().default(true),
  /** null = não expira. */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  useCount: integer("use_count").notNull().default(0),
  /**
   * Se este token pode PROPOR alterações pelo MCP (nunca gravar — proposta
   * continua exigindo aprovação na tela). Falso por padrão: um link de leitura
   * colado numa IA de terceiro não deve ganhar poder de escrita por herança.
   */
  podePropor: boolean("pode_propor").notNull().default(false),
});


// 18. Anexos de referência de experiências e formação — links e arquivos que
// comprovam ou ilustram (certificado, repositório, artigo), como as mídias do
// LinkedIn. NUNCA entram no currículo gerado: existem para consulta.
//
// Tabela própria em vez de reusar `documents`, que serve para alimentar a IA
// (extracted_text, use_for_ai). Vínculo polimórfico porque atende duas tabelas;
// Postgres não faz FK condicional, então a limpeza fica nos repositórios.
export const anexosReferencia = pgTable("anexos_referencia", {
  id: serial("id").primaryKey(),
  entidade: varchar("entidade", { length: 20 }).notNull().$type<"experiencia" | "formacao">(),
  entidadeId: integer("entidade_id").notNull(),
  rotulo: varchar("rotulo", { length: 150 }).notNull(),
  /** Um dos dois é obrigatório — CHECK no banco garante. */
  url: varchar("url", { length: 1000 }),
  filename: varchar("filename", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 19. Conversas do assistente. Saíram do localStorage porque a conversa sumia
// ao limpar dados do site e não existia em outro dispositivo — junto com os
// fatos que tinham sido corrigidos ali.
export const chatConversas = pgTable("chat_conversas", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 200 }),
  /** Resumo dos turnos antigos, para o prompt não crescer sem limite. */
  resumoRolante: text("resumo_rolante"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatMensagens = pgTable("chat_mensagens", {
  id: serial("id").primaryKey(),
  conversaId: integer("conversa_id")
    .notNull()
    .references(() => chatConversas.id, { onDelete: "cascade" }),
  papel: varchar("papel", { length: 10 }).notNull().$type<"user" | "model">(),
  texto: text("texto").notNull(),
  /** Só nome e mimeType — o binário não entra no banco. */
  anexosMeta: jsonb("anexos_meta").$type<{ nome: string; mimeType: string }[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 20. Customização dos prompts. Guarda SÓ o que o usuário reescreveu — o
// padrão fica no código (src/server/ai/prompts.ts) e nunca é copiado para cá,
// então "restaurar" é apagar a linha e um default melhorado passa a valer sem
// migrar dado. A regra anti-alucinação NÃO mora aqui: é concatenada depois,
// fora do alcance do editor.
export const promptCustomizacoes = pgTable("prompt_customizacoes", {
  chave: varchar("chave", { length: 60 }).primaryKey(),
  texto: text("texto").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow(),
});

// 20. Propostas de escrita aguardando aprovação.
//
// O assistente propõe e o usuário aprova na tela — mas a proposta vivia só na
// resposta do turno, e fechar a aba a perdia. Isso basta com a tela aberta;
// deixa de bastar quando o pedido nasce noutro app (chat externo via MCP), onde
// pedir e aprovar são momentos separados por horas.
export const propostas = pgTable("propostas", {
  id: serial("id").primaryKey(),
  /** Chave de ARGS_SCHEMAS — o que aplicarEscrita() despacha. */
  ferramenta: varchar("ferramenta", { length: 60 }).notNull(),
  argumentos: jsonb("argumentos").$type<Record<string, unknown>>().notNull(),
  /** "assistente" (chat interno) ou "mcp" (chat externo). */
  origem: varchar("origem", { length: 20 }).notNull().default("assistente").$type<"assistente" | "mcp">(),
  /** Rótulo de quem propôs — uma origem que você não reconhece é o alarme. */
  origemRotulo: varchar("origem_rotulo", { length: 100 }),
  estado: varchar("estado", { length: 12 }).notNull().default("pendente").$type<"pendente" | "aplicada" | "rejeitada">(),
  resultado: text("resultado"),
  criadaEm: timestamp("criada_em", { withTimezone: true }).notNull().defaultNow(),
  resolvidaEm: timestamp("resolvida_em", { withTimezone: true }),
  /** Sete dias. Proposta velha é pior que nenhuma — ver a migration 0018. */
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
});

// 21. OAuth do conector MCP. Só o hash fica guardado, como em sessions.
export const oauthCodes = pgTable("oauth_codes", {
  codeHash: varchar("code_hash", { length: 64 }).primaryKey(),
  clientId: varchar("client_id", { length: 500 }).notNull(),
  redirectUri: varchar("redirect_uri", { length: 500 }).notNull(),
  /** PKCE S256 — sem isto um code interceptado vira token. */
  codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
  tokenId: integer("token_id").references(() => publicProfileTokens.id, { onDelete: "cascade" }),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  accessHash: varchar("access_hash", { length: 64 }).notNull().unique(),
  /** Rotacionado a cada refresh — exigência da spec para cliente público. */
  refreshHash: varchar("refresh_hash", { length: 64 }).unique(),
  clientId: varchar("client_id", { length: 500 }).notNull(),
  tokenId: integer("token_id").references(() => publicProfileTokens.id, { onDelete: "cascade" }),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  ultimoUso: timestamp("ultimo_uso", { withTimezone: true }),
});

// 17. Tentativas de login, para travar força bruta. Uma linha por tentativa
// falha; as bem-sucedidas limpam as do identificador. Fica no banco (e não em
// memória) porque o processo reinicia a cada deploy e um atacante não deveria
// ganhar um balde novo de tentativas junto.
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(), // email ou IP
  attemptedAt: timestamp("attempted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Tipos inferidos (select e insert) para uso nos repositórios.
export type Perfil = typeof perfil.$inferSelect;
export type NewPerfil = typeof perfil.$inferInsert;
export type Experiencia = typeof experiencias.$inferSelect;
export type NewExperiencia = typeof experiencias.$inferInsert;
export type FormacaoProjeto = typeof formacaoEProjetos.$inferSelect;
export type NewFormacaoProjeto = typeof formacaoEProjetos.$inferInsert;
export type Curso = typeof educacaoECursos.$inferSelect;
export type NewCurso = typeof educacaoECursos.$inferInsert;
export type Idioma = typeof idiomas.$inferSelect;
export type NewIdioma = typeof idiomas.$inferInsert;
export type HistoricoGeracao = typeof historicoGeracoes.$inferSelect;
export type NewHistoricoGeracao = typeof historicoGeracoes.$inferInsert;
export type CanadaProfile = typeof canadaProfile.$inferSelect;
export type NewCanadaProfile = typeof canadaProfile.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type NewApplicationEvent = typeof applicationEvents.$inferInsert;
export type ProfileEmbedding = typeof profileEmbedding.$inferSelect;
export type NewProfileEmbedding = typeof profileEmbedding.$inferInsert;
export type NocCode = typeof nocCodes.$inferSelect;
export type NewNocCode = typeof nocCodes.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AnexoReferencia = typeof anexosReferencia.$inferSelect;
export type NewAnexoReferencia = typeof anexosReferencia.$inferInsert;
export type ChatConversa = typeof chatConversas.$inferSelect;
export type ChatMensagem = typeof chatMensagens.$inferSelect;
export type NewChatMensagem = typeof chatMensagens.$inferInsert;
export type OauthCode = typeof oauthCodes.$inferSelect;
export type OauthToken = typeof oauthTokens.$inferSelect;
export type Proposta = typeof propostas.$inferSelect;
export type NewProposta = typeof propostas.$inferInsert;
export type PromptCustomizacao = typeof promptCustomizacoes.$inferSelect;
export type PublicProfileToken = typeof publicProfileTokens.$inferSelect;
export type NewPublicProfileToken = typeof publicProfileTokens.$inferInsert;
