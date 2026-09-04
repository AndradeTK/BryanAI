import { z } from "zod";
import { sanitizeForGemini } from "@/server/ai/client";
import {
  ARGS_SCHEMAS,
  ROTULO_ESCRITA,
  type NomeEscrita,
  type NomeLeitura,
} from "@/server/chat/ferramentas";

/**
 * O contrato MCP: quais ferramentas o chat externo enxerga, com que nome e
 * com que descrição.
 *
 * As descrições NÃO são documentação — são lidas pelo modelo e guiam o que ele
 * faz. Por isso são estáticas, escritas à mão e no código: gerar descrição a
 * partir de dado do banco abriria a porta para tool poisoning, onde um texto
 * que entrou como dado vira instrução.
 *
 * Os nomes são em inglês com prefixo `bryanai_` porque aparecem no seletor do
 * Claude ao lado de Gmail, Drive e Notion. `salvarPerfil` solto ali é ambíguo;
 * e o prefixo evita colisão com outro conector.
 */

export const PROTOCOL_VERSION = "2026-07-28";
export const SERVER_INFO = { name: "bryanai", version: "1.0.0" } as const;

/** O aviso que precede toda escrita. Sem ele o modelo tenta de novo. */
const NAO_GRAVA =
  "Esta ferramenta NÃO grava nada: registra uma proposta que fica pendente até Bryan revisar e confirmar dentro do BryanAI. Depois de chamá-la, avise que a proposta ficou pendente e siga a conversa — não chame de novo esperando que funcione desta vez, e não trate a alteração como já aplicada.";

interface ToolLeitura {
  tipo: "leitura";
  interna: NomeLeitura;
  descricao: string;
}
/**
 * Importação em lote: recebe o TEXTO de um perfil e cria uma proposta por item
 * que ainda não existe. É escrita para todos os efeitos — passa pelas mesmas
 * travas de escopo e limite — mas não mapeia para uma chave de ARGS_SCHEMAS,
 * porque produz várias propostas de tipos diferentes numa chamada só.
 */
interface ToolImport {
  tipo: "import";
  descricao: string;
}

interface ToolEscrita {
  tipo: "escrita";
  interna: NomeEscrita;
  descricao: string;
  /** true quando a operação apaga dado — muda o comportamento do cliente. */
  destrutiva?: boolean;
}

export const TOOLS: Record<string, ToolLeitura | ToolEscrita | ToolImport> = {
  // ---------- Leitura: executa direto ----------
  bryanai_profile_read: {
    tipo: "leitura",
    interna: "lerPerfil",
    descricao:
      "Lê os dados pessoais de Bryan e o perfil de imigração canadense: autorização de trabalho, nível CLB/NCLC, status de ECA, profissão regulamentada e províncias de preferência. Consulte antes de analisar qualquer vaga no Canadá — a autorização de trabalho determina se ele sequer é elegível.",
  },
  bryanai_experience_list: {
    tipo: "leitura",
    interna: "listarExperiencias",
    descricao:
      "Lista as experiências profissionais com id, empresa, cargo, datas, atividades e conquistas. Os ids retornados aqui são obrigatórios para propor atualização de uma experiência existente.",
  },
  bryanai_education_list: {
    tipo: "leitura",
    interna: "listarFormacao",
    descricao:
      "Lista formação acadêmica, projetos e atividades extracurriculares (monitoria, embaixador estudantil, voluntariado), com ids.",
  },
  bryanai_certification_list: {
    tipo: "leitura",
    interna: "listarCursos",
    descricao: "Lista certificações e cursos concluídos, com ids.",
  },
  bryanai_language_list: {
    tipo: "leitura",
    interna: "listarIdiomas",
    descricao: "Lista idiomas com nível CEFR e exames prestados, com ids.",
  },
  bryanai_application_list: {
    tipo: "leitura",
    interna: "listarCandidaturas",
    descricao:
      "Lista as candidaturas do kanban: vaga, empresa, status atual, score de compatibilidade e id.",
  },
  bryanai_answer_list: {
    tipo: "leitura",
    interna: "listarRespostas",
    descricao:
      "Lista as respostas reutilizáveis que Bryan já salvou para perguntas recorrentes de formulários de candidatura.",
  },
  bryanai_document_list: {
    tipo: "leitura",
    interna: "listarDocumentos",
    descricao:
      "Lista os documentos anexados (cartas de recomendação, comprovantes) com o texto extraído de cada um. As cartas costumam descrever conquistas que ainda não estão cadastradas no perfil — consulte antes de concluir que algo não existe no histórico dele.",
  },

  // ---------- Importação em lote ----------
  bryanai_profile_import: {
    tipo: "import",
    descricao: `Importa um perfil profissional inteiro a partir de TEXTO, criando uma proposta para cada item que ainda não existe no cadastro de Bryan. ${NAO_GRAVA}

COMO OBTER O TEXTO, em ordem de preferência:
1. Se você consegue controlar o navegador dele (Claude for Chrome), ABRA o perfil do LinkedIn dele — a URL está em bryanai_profile_read, campo "linkedin"; se vier vazio, pergunte a ele — e LEIA a página. Role até o fim para carregar as seções de experiência, formação e licenças, e clique em "Ver mais"/"Show all" onde houver, porque o LinkedIn corta listas longas. Depois passe o que leu.
2. Se ele colou o conteúdo na conversa, use o que ele colou.
3. Se nenhum dos dois, peça a ele: no perfil do LinkedIn, More → Save to PDF, e subir em Configurações do BryanAI.

Passe o texto COMPLETO e SEM REESCREVER em "texto" — a extração acontece do lado do servidor, e resumir aqui perde informação que ele quer revisar. Itens que já estão no perfil são descartados automaticamente, então não é preciso consultar as listas antes.`,
  },

  // ---------- Escrita: cria proposta, não grava ----------
  bryanai_experience_save: {
    tipo: "escrita",
    interna: "salvarExperiencia",
    descricao: `Propõe criar ou atualizar uma experiência profissional. ${NAO_GRAVA} Passe "id" SOMENTE para atualizar uma experiência existente, e obtenha o id com bryanai_experience_list antes; sem "id", cria uma nova. Não invente datas nem números de resultado: se Bryan disse "uns dois anos", pergunte o mês e o ano em vez de estimar.`,
  },
  bryanai_education_save: {
    tipo: "escrita",
    interna: "salvarFormacao",
    descricao: `Propõe criar ou atualizar uma formação, projeto ou atividade extracurricular. ${NAO_GRAVA} Use tipo "atividade" para monitoria, embaixador estudantil e voluntariado — e marque noCanada quando tiver acontecido no Canadá, porque conta como experiência canadense.`,
  },
  bryanai_certification_save: {
    tipo: "escrita",
    interna: "salvarCurso",
    descricao: `Propõe criar ou atualizar uma certificação ou curso. ${NAO_GRAVA}`,
  },
  bryanai_language_save: {
    tipo: "escrita",
    interna: "salvarIdioma",
    descricao: `Propõe criar ou atualizar um idioma. ${NAO_GRAVA} Use o nível CEFR (A1 a C2) que Bryan informar; não estime a partir de como ele escreve.`,
  },
  bryanai_application_move: {
    tipo: "escrita",
    interna: "moverCandidatura",
    descricao: `Propõe mover uma candidatura para outra coluna do kanban (saved, applied, interview, offer, rejected, archived). ${NAO_GRAVA} Obtenha o id com bryanai_application_list.`,
  },
  bryanai_answer_save: {
    tipo: "escrita",
    interna: "salvarResposta",
    descricao: `Propõe salvar uma resposta reutilizável para uma pergunta recorrente de formulário de candidatura. ${NAO_GRAVA}`,
  },
};

/**
 * Converte o schema Zod da escrita para o JSON Schema do `inputSchema`.
 *
 * Reusa o `sanitizeForGemini` porque o problema é o mesmo: `z.toJSONSchema`
 * emite `$schema`, `$ref` e `anyOf` que confundem consumidores que aceitam só
 * um subconjunto. O nome é do primeiro uso, mas a limpeza serve aos dois.
 */
function inputSchemaDe(nome: string): Record<string, unknown> {
  const tool = TOOLS[nome];
  if (tool.tipo === "import") {
    return {
      type: "object",
      properties: {
        texto: {
          type: "string",
          description:
            "O conteúdo do perfil, copiado como está. Não resuma nem reescreva.",
        },
      },
      required: ["texto"],
    };
  }
  if (tool.tipo === "leitura") {
    // Sem parâmetros: a spec recomenda declarar que só aceita objeto vazio.
    return { type: "object", additionalProperties: false };
  }
  return sanitizeForGemini(
    z.toJSONSchema(ARGS_SCHEMAS[tool.interna]),
  ) as Record<string, unknown>;
}

function tituloDe(t: ToolLeitura | ToolEscrita | ToolImport): string {
  if (t.tipo === "escrita") return ROTULO_ESCRITA[t.interna];
  if (t.tipo === "import") return "Importar perfil";
  return t.interna;
}

/** A lista que o `tools/list` devolve. Ordem estável — a spec pede determinismo. */
export function listarTools() {
  return Object.keys(TOOLS)
    .sort()
    .map((nome) => {
      const t = TOOLS[nome];
      return {
        name: nome,
        title: tituloDe(t),
        description: t.descricao,
        inputSchema: inputSchemaDe(nome),
        annotations: {
          title: tituloDe(t),
          readOnlyHint: t.tipo === "leitura",
          /**
           * Nenhuma escrita apaga: no v1 o MCP só adiciona ou reposiciona, e
           * mesmo assim o efeito é criar uma proposta, não gravar. Marcar como
           * destrutiva faria o Claude pedir confirmação por chamada — proteção
           * que aqui é redundante e viraria atrito a cada uso.
           */
          destructiveHint: false,
          /** Rechamar com os mesmos argumentos não deve duplicar a proposta. */
          idempotentHint: t.tipo !== "leitura",
        },
      };
    });
}

export function ehToolConhecida(nome: string): boolean {
  return nome in TOOLS;
}
