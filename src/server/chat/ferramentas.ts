import "server-only";
import { z } from "zod";
import {
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchemaProperty,
} from "@google/generative-ai";
import {
  perfilRepo,
  canadaProfileRepo,
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  applicationRepo,
  answerRepo,
} from "@/server/db/repositories";

/**
 * Ferramentas do assistente, separadas por risco.
 *
 * LEITURA executa na hora: é o que dá contexto ao modelo, não muda nada e
 * precisa acontecer dentro do turno para ele conseguir responder.
 *
 * ESCRITA nunca executa sozinha. O modelo monta a alteração, o turno termina, e
 * a tela mostra o que mudaria para o usuário aprovar. A razão é concreta: estes
 * dados alimentam tudo que o sistema gera, e um modelo interpretando
 * "trabalhei lá uns dois anos" como datas exatas, ou editando a experiência
 * errada, estragaria a base silenciosamente.
 */

// ============================================================
// Schemas das escritas — validam a proposta quando ela volta do cliente
// ============================================================
// A proposta faz um ida-e-volta pelo navegador até o botão de aprovar, então o
// que chega de volta é entrada não confiável, mesmo numa aplicação de um
// usuário só. Nada é gravado sem passar por aqui.

const Data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
  .nullable()
  .optional();

export const ARGS_SCHEMAS = {
  salvarPerfil: z.object({
    nomeCompleto: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    telefone: z.string().nullable().optional(),
    localizacao: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
    github: z.string().nullable().optional(),
    resumoBase: z.string().nullable().optional(),
  }),

  salvarExperiencia: z.object({
    id: z.number().int().positive().optional(),
    empresa: z.string().min(1),
    cargo: z.string().min(1),
    dataInicio: Data,
    dataFim: Data,
    categoria: z.string().nullable().optional(),
    tagsTecnicas: z.array(z.string()).optional(),
    descricaoAtividades: z.string().nullable().optional(),
    principaisConquistas: z.string().nullable().optional(),
  }),
  removerExperiencia: z.object({ id: z.number().int().positive() }),

  salvarFormacao: z.object({
    id: z.number().int().positive().optional(),
    tipo: z.enum(["educacao", "projeto"]),
    tituloCurso: z.string().min(1),
    instituicaoProjeto: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    descricaoDetalhada: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
  }),
  removerFormacao: z.object({ id: z.number().int().positive() }),

  salvarCurso: z.object({
    id: z.number().int().positive().optional(),
    tituloDoCurso: z.string().min(1),
    emissorInstituicao: z.string().nullable().optional(),
    descricao: z.string().nullable().optional(),
    destaque: z.boolean().optional(),
    link: z.string().nullable().optional(),
  }),
  removerCurso: z.object({ id: z.number().int().positive() }),

  salvarIdioma: z.object({
    id: z.number().int().positive().optional(),
    idioma: z.string().min(1),
    nivelCefr: z.string().nullable().optional(),
    certificacaoExame: z.string().nullable().optional(),
    historicoDeEscolas: z.string().nullable().optional(),
    link: z.string().nullable().optional(),
  }),
  removerIdioma: z.object({ id: z.number().int().positive() }),

  salvarPerfilCanadense: z.object({
    workAuthorization: z
      .enum([
        "citizen", "pr", "pgwp", "owp", "spouse_owp",
        "study_permit", "needs_lmia", "needs_sponsorship",
      ])
      .optional(),
    preferredProvinces: z.array(z.string()).nullable().optional(),
    clbEnglish: z.number().int().min(1).max(12).nullable().optional(),
    nclcFrench: z.number().int().min(1).max(12).nullable().optional(),
    languageTest: z.enum(["none", "ielts", "celpip", "tef", "tcf"]).optional(),
    ecaStatus: z
      .enum(["none", "in_progress", "wes", "ices", "iqas", "ces", "icas"])
      .optional(),
    ecaEquivalency: z.string().nullable().optional(),
    regulatedProfession: z.string().nullable().optional(),
    licenseStatus: z.enum(["na", "not_started", "in_progress", "licensed"]).optional(),
    canadianExpMonths: z.number().int().min(0).optional(),
    canadianCity: z.string().nullable().optional(),
    canadianPhone: z.string().nullable().optional(),
  }),

  moverCandidatura: z.object({
    id: z.number().int().positive(),
    status: z.enum(["saved", "applied", "interview", "offer", "rejected", "archived"]),
  }),

  salvarResposta: z.object({
    pergunta: z.string().min(1),
    resposta: z.string().min(1),
  }),
} as const;

export type NomeEscrita = keyof typeof ARGS_SCHEMAS;

/** Rótulo legível da operação, para a tela de confirmação. */
export const ROTULO_ESCRITA: Record<NomeEscrita, string> = {
  salvarPerfil: "Atualizar perfil",
  salvarExperiencia: "Salvar experiência",
  removerExperiencia: "Remover experiência",
  salvarFormacao: "Salvar formação/projeto",
  removerFormacao: "Remover formação/projeto",
  salvarCurso: "Salvar certificação",
  removerCurso: "Remover certificação",
  salvarIdioma: "Salvar idioma",
  removerIdioma: "Remover idioma",
  salvarPerfilCanadense: "Atualizar perfil canadense",
  moverCandidatura: "Mover candidatura",
  salvarResposta: "Salvar resposta reutilizável",
};

// ============================================================
// Execução das escritas — só depois de aprovada
// ============================================================
export async function aplicarEscrita(
  nome: NomeEscrita,
  argsBrutos: unknown,
): Promise<string> {
  const args = ARGS_SCHEMAS[nome].parse(argsBrutos);

  switch (nome) {
    case "salvarPerfil": {
      const a = args as z.infer<typeof ARGS_SCHEMAS.salvarPerfil>;
      const atual = await perfilRepo.get();
      await perfilRepo.upsert({
        nomeCompleto: a.nomeCompleto ?? atual?.nomeCompleto ?? "",
        email: a.email ?? atual?.email ?? null,
        telefone: a.telefone ?? atual?.telefone ?? null,
        localizacao: a.localizacao ?? atual?.localizacao ?? null,
        linkedin: a.linkedin ?? atual?.linkedin ?? null,
        github: a.github ?? atual?.github ?? null,
        resumoBase: a.resumoBase ?? atual?.resumoBase ?? null,
        dataNascimento: atual?.dataNascimento ?? null,
      });
      return "Perfil atualizado.";
    }

    case "salvarExperiencia": {
      const { id, ...dados } = args as z.infer<typeof ARGS_SCHEMAS.salvarExperiencia>;
      if (id) await experienciaRepo.update(id, dados);
      else await experienciaRepo.create(dados);
      return id ? "Experiência atualizada." : "Experiência adicionada.";
    }
    case "removerExperiencia":
      await experienciaRepo.remove((args as { id: number }).id);
      return "Experiência removida.";

    case "salvarFormacao": {
      const { id, ...dados } = args as z.infer<typeof ARGS_SCHEMAS.salvarFormacao>;
      if (id) await formacaoRepo.update(id, dados);
      else await formacaoRepo.create(dados);
      return id ? "Formação atualizada." : "Formação adicionada.";
    }
    case "removerFormacao":
      await formacaoRepo.remove((args as { id: number }).id);
      return "Formação removida.";

    case "salvarCurso": {
      const { id, ...dados } = args as z.infer<typeof ARGS_SCHEMAS.salvarCurso>;
      if (id) await cursoRepo.update(id, dados);
      else await cursoRepo.create(dados);
      return id ? "Certificação atualizada." : "Certificação adicionada.";
    }
    case "removerCurso":
      await cursoRepo.remove((args as { id: number }).id);
      return "Certificação removida.";

    case "salvarIdioma": {
      const { id, ...dados } = args as z.infer<typeof ARGS_SCHEMAS.salvarIdioma>;
      if (id) await idiomaRepo.update(id, dados);
      else await idiomaRepo.create(dados);
      return id ? "Idioma atualizado." : "Idioma adicionado.";
    }
    case "removerIdioma":
      await idiomaRepo.remove((args as { id: number }).id);
      return "Idioma removido.";

    case "salvarPerfilCanadense": {
      const a = args as z.infer<typeof ARGS_SCHEMAS.salvarPerfilCanadense>;
      const atual = await canadaProfileRepo.get();
      await canadaProfileRepo.upsert({ ...(atual ?? {}), ...a });
      return "Perfil canadense atualizado.";
    }

    case "moverCandidatura": {
      const a = args as z.infer<typeof ARGS_SCHEMAS.moverCandidatura>;
      const row = await applicationRepo.updateStatus(a.id, a.status);
      if (!row) throw new Error("Candidatura não encontrada.");
      return `Candidatura movida para "${a.status}".`;
    }

    case "salvarResposta": {
      const a = args as z.infer<typeof ARGS_SCHEMAS.salvarResposta>;
      const { normalizeQuestion } = await import("@/server/apply/answers");
      await answerRepo.upsert(normalizeQuestion(a.pergunta), a.pergunta, a.resposta);
      return "Resposta salva.";
    }
  }
}

// ============================================================
// Leituras — executam durante o turno
// ============================================================
export const LEITURAS = {
  lerPerfil: async () => ({
    perfil: await perfilRepo.get(),
    canada: await canadaProfileRepo.get(),
  }),
  listarExperiencias: () => experienciaRepo.getAll(),
  listarFormacao: () => formacaoRepo.getAll(),
  listarCursos: () => cursoRepo.getAll(),
  listarIdiomas: () => idiomaRepo.getAll(),
  listarCandidaturas: () => applicationRepo.getBoard(),
  listarRespostas: () => answerRepo.getAll(),
} as const;

export type NomeLeitura = keyof typeof LEITURAS;

export function ehLeitura(nome: string): nome is NomeLeitura {
  return nome in LEITURAS;
}
export function ehEscrita(nome: string): nome is NomeEscrita {
  return nome in ARGS_SCHEMAS;
}

// ============================================================
// Declarações para o Gemini
// ============================================================
const S = SchemaType;

/** Atalho: string opcional e anulável, que é a forma da maioria dos campos. */
const texto = (description: string): FunctionDeclarationSchemaProperty =>
  ({ type: S.STRING, description }) as FunctionDeclarationSchemaProperty;

export const DECLARACOES: FunctionDeclaration[] = [
  // ---- leitura ----
  {
    name: "lerPerfil",
    description:
      "Lê os dados pessoais e o perfil canadense (autorização de trabalho, CLB, ECA, províncias). Use antes de propor alteração no perfil.",
    parameters: { type: S.OBJECT, properties: {} },
  },
  {
    name: "listarExperiencias",
    description:
      "Lista as experiências profissionais com seus ids. SEMPRE chame antes de atualizar ou remover uma, para usar o id certo.",
    parameters: { type: S.OBJECT, properties: {} },
  },
  {
    name: "listarFormacao",
    description: "Lista formação acadêmica e projetos, com ids.",
    parameters: { type: S.OBJECT, properties: {} },
  },
  {
    name: "listarCursos",
    description: "Lista certificações e cursos, com ids.",
    parameters: { type: S.OBJECT, properties: {} },
  },
  {
    name: "listarIdiomas",
    description: "Lista idiomas e níveis, com ids.",
    parameters: { type: S.OBJECT, properties: {} },
  },
  {
    name: "listarCandidaturas",
    description: "Lista as candidaturas do kanban com vaga, status e id.",
    parameters: { type: S.OBJECT, properties: {} },
  },
  {
    name: "listarRespostas",
    description: "Lista as respostas reutilizáveis de formulários de candidatura.",
    parameters: { type: S.OBJECT, properties: {} },
  },

  // ---- escrita ----
  {
    name: "salvarPerfil",
    description:
      "Propõe alteração nos dados pessoais. Informe SOMENTE os campos que mudam.",
    parameters: {
      type: S.OBJECT,
      properties: {
        nomeCompleto: texto("Nome completo"),
        email: texto("E-mail principal"),
        telefone: texto("Telefone com código do país"),
        localizacao: texto("Cidade, estado/província, país"),
        linkedin: texto("URL do LinkedIn"),
        github: texto("URL do GitHub"),
        resumoBase: texto("Resumo profissional em texto corrido"),
      },
    },
  },
  {
    name: "salvarExperiencia",
    description:
      "Propõe criar ou atualizar uma experiência profissional. Passe `id` só ao ATUALIZAR uma existente — obtenha o id com listarExperiencias primeiro. Sem id, cria uma nova.",
    parameters: {
      type: S.OBJECT,
      properties: {
        id: { type: S.NUMBER, description: "Id da experiência a atualizar. Omita para criar." },
        empresa: texto("Nome da empresa"),
        cargo: texto("Cargo ocupado"),
        dataInicio: texto("Início no formato AAAA-MM-DD. Se souber só mês/ano, use o dia 01."),
        dataFim: texto("Fim no formato AAAA-MM-DD. Deixe vazio se for o emprego atual."),
        categoria: texto("Área, ex.: Desenvolvimento, Administrativo, Atendimento"),
        tagsTecnicas: {
          type: S.ARRAY,
          items: { type: S.STRING },
          description: "Tecnologias e ferramentas usadas",
        },
        descricaoAtividades: texto("O que a pessoa fazia"),
        principaisConquistas: texto("Resultados concretos. NÃO invente números."),
      },
      required: ["empresa", "cargo"],
    },
  },
  {
    name: "removerExperiencia",
    description: "Propõe remover uma experiência. Confirme o id com listarExperiencias.",
    parameters: {
      type: S.OBJECT,
      properties: { id: { type: S.NUMBER, description: "Id da experiência" } },
      required: ["id"],
    },
  },
  {
    name: "salvarFormacao",
    description:
      "Propõe criar ou atualizar formação acadêmica (tipo 'educacao') ou projeto (tipo 'projeto').",
    parameters: {
      type: S.OBJECT,
      properties: {
        id: { type: S.NUMBER, description: "Id ao atualizar. Omita para criar." },
        tipo: { type: S.STRING, format: "enum", enum: ["educacao", "projeto"] },
        tituloCurso: texto("Nome do curso ou do projeto"),
        instituicaoProjeto: texto("Instituição de ensino ou origem do projeto"),
        status: texto("Ex.: Concluído, Em andamento, Entregue"),
        descricaoDetalhada: texto("Descrição"),
        link: texto("URL do diploma, repositório ou demo"),
      },
      required: ["tipo", "tituloCurso"],
    },
  },
  {
    name: "removerFormacao",
    description: "Propõe remover uma formação ou projeto.",
    parameters: {
      type: S.OBJECT,
      properties: { id: { type: S.NUMBER, description: "Id" } },
      required: ["id"],
    },
  },
  {
    name: "salvarCurso",
    description: "Propõe criar ou atualizar uma certificação.",
    parameters: {
      type: S.OBJECT,
      properties: {
        id: { type: S.NUMBER, description: "Id ao atualizar. Omita para criar." },
        tituloDoCurso: texto("Nome da certificação"),
        emissorInstituicao: texto("Quem emitiu, ex.: Google, Cisco"),
        descricao: texto("O que o curso cobriu"),
        destaque: { type: S.BOOLEAN, description: "Destacar no currículo" },
        link: texto("URL do certificado"),
      },
      required: ["tituloDoCurso"],
    },
  },
  {
    name: "removerCurso",
    description: "Propõe remover uma certificação.",
    parameters: {
      type: S.OBJECT,
      properties: { id: { type: S.NUMBER, description: "Id" } },
      required: ["id"],
    },
  },
  {
    name: "salvarIdioma",
    description: "Propõe criar ou atualizar um idioma.",
    parameters: {
      type: S.OBJECT,
      properties: {
        id: { type: S.NUMBER, description: "Id ao atualizar. Omita para criar." },
        idioma: texto("Nome do idioma"),
        nivelCefr: texto("Nível, ex.: B2 - Intermediário Avançado, Nativo"),
        certificacaoExame: texto("Exame e pontuação"),
        historicoDeEscolas: texto("Cursos e escolas"),
        link: texto("URL do certificado"),
      },
      required: ["idioma"],
    },
  },
  {
    name: "removerIdioma",
    description: "Propõe remover um idioma.",
    parameters: {
      type: S.OBJECT,
      properties: { id: { type: S.NUMBER, description: "Id" } },
      required: ["id"],
    },
  },
  {
    name: "salvarPerfilCanadense",
    description:
      "Propõe alteração no perfil canadense. ATENÇÃO: workAuthorization muda o veredicto de TODA vaga analisada — só altere com informação explícita do usuário, nunca por inferência.",
    parameters: {
      type: S.OBJECT,
      properties: {
        workAuthorization: {
          type: S.STRING,
          format: "enum",
          enum: ["citizen", "pr", "pgwp", "owp", "spouse_owp", "study_permit", "needs_lmia", "needs_sponsorship"],
        },
        preferredProvinces: {
          type: S.ARRAY,
          items: { type: S.STRING },
          description: "Siglas: ON, BC, AB, QC...",
        },
        clbEnglish: { type: S.NUMBER, description: "CLB de 1 a 12" },
        nclcFrench: { type: S.NUMBER, description: "NCLC de 1 a 12" },
        languageTest: {
          type: S.STRING,
          format: "enum",
          enum: ["none", "ielts", "celpip", "tef", "tcf"],
        },
        ecaStatus: {
          type: S.STRING,
          format: "enum",
          enum: ["none", "in_progress", "wes", "ices", "iqas", "ces", "icas"],
        },
        ecaEquivalency: texto("Equivalência obtida"),
        regulatedProfession: texto("Profissão regulamentada, se houver"),
        licenseStatus: {
          type: S.STRING,
          format: "enum",
          enum: ["na", "not_started", "in_progress", "licensed"],
        },
        canadianExpMonths: { type: S.NUMBER, description: "Meses de experiência no Canadá" },
        canadianCity: texto("Cidade canadense, ex.: Calgary, AB"),
        canadianPhone: texto("Telefone canadense com +1"),
      },
    },
  },
  {
    name: "moverCandidatura",
    description: "Propõe mudar o status de uma candidatura no kanban.",
    parameters: {
      type: S.OBJECT,
      properties: {
        id: { type: S.NUMBER, description: "Id da candidatura (listarCandidaturas)" },
        status: {
          type: S.STRING,
          format: "enum",
          enum: ["saved", "applied", "interview", "offer", "rejected", "archived"],
        },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "salvarResposta",
    description:
      "Propõe salvar uma resposta reutilizável de formulário de candidatura, para reaproveitar nas próximas vagas.",
    parameters: {
      type: S.OBJECT,
      properties: {
        pergunta: texto("A pergunta como aparece no formulário"),
        resposta: texto("Sua resposta"),
      },
      required: ["pergunta", "resposta"],
    },
  },
];
