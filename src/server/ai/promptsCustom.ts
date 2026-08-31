import { db } from "@/server/db/client";
import { promptCustomizacoes } from "@/server/db/schema";
import {
  ANALYZER_SYSTEM_PROMPT,
  WRITER_SYSTEM_PROMPT,
  WRITER_REGRAS_IMUTAVEIS,
} from "./prompts";

/**
 * Prompts que a tela de Configurações permite reescrever.
 *
 * `padrao` é a fonte da verdade: fica no código, nunca é copiado para o banco.
 * O banco guarda só a customização, então "restaurar" é apagar uma linha — e
 * um default melhorado numa versão nova passa a valer sem migrar dado.
 *
 * `imutavel` é o que o editor NÃO mostra e sempre vai por último no prompt
 * final. É onde mora a regra anti-alucinação de métricas: um campo de texto
 * livre que a contivesse seria um campo onde ela pode ser apagada, e a
 * proteção voltaria a depender de o usuário não se distrair.
 */
export const PROMPTS_EDITAVEIS = {
  writer: {
    label: "Como a IA escreve o currículo",
    descricao:
      "Estilo dos bullets, verbos, tom. A regra que proíbe inventar métricas é aplicada sempre e não aparece aqui.",
    padrao: WRITER_SYSTEM_PROMPT,
    imutavel: WRITER_REGRAS_IMUTAVEIS,
  },
  analyzer: {
    label: "Como a IA analisa a compatibilidade",
    descricao:
      "Critérios e pesos da análise de vaga. Afeta o score e os pontos levantados.",
    padrao: ANALYZER_SYSTEM_PROMPT,
    imutavel: "",
  },
} as const;

export type ChavePrompt = keyof typeof PROMPTS_EDITAVEIS;

export function ehChaveValida(chave: string): chave is ChavePrompt {
  return chave in PROMPTS_EDITAVEIS;
}

/** Customizações salvas, por chave. Vazio = tudo no padrão. */
export async function customizacoes(): Promise<Partial<Record<ChavePrompt, string>>> {
  const linhas = await db.select().from(promptCustomizacoes);
  const mapa: Partial<Record<ChavePrompt, string>> = {};
  for (const l of linhas) {
    if (ehChaveValida(l.chave)) mapa[l.chave] = l.texto;
  }
  return mapa;
}

/**
 * Monta o prompt final: customização (ou padrão) + bloco imutável.
 *
 * A ordem importa. O bloco imutável vem por último porque instrução mais perto
 * da tarefa pesa mais na atenção do modelo — se o texto customizado tentar
 * afrouxar a regra, ela é reafirmada depois.
 */
export async function promptDe(chave: ChavePrompt): Promise<string> {
  const spec = PROMPTS_EDITAVEIS[chave];
  const salvas = await customizacoes();
  const base = salvas[chave]?.trim() || spec.padrao;
  return spec.imutavel ? `${base}\n\n${spec.imutavel}` : base;
}
