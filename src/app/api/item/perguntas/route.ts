import { z } from "zod";
import { ok, fail, handle, guardPanel } from "@/server/http/api";
import { generateStructured, MODELS } from "@/server/ai/client";
import { PerguntasItemSchema } from "@/server/ai/schemas";
import { contextoDeData } from "@/server/ai/prompts";

/**
 * Gera um formulário de perguntas a partir do que o usuário já escreveu num
 * item (experiência, formação, projeto, atividade).
 *
 * O problema que resolve: o sistema registra o que a pessoa lembrou NAQUELE
 * DIA e trata isso como o que ela fez. Quem cadastra "limpar mesas, servir
 * comida" perde para sempre o fechamento de caixa, o treinamento de novatos e
 * o controle de estoque — que estavam lá, mas ninguém perguntou.
 *
 * A postura é interrogativa, nunca generativa. A rota devolve PERGUNTAS; o
 * schema não tem campo para resposta sugerida, então não existe caminho para a
 * IA propor um fato que o usuário aceita com um clique. Sugerir competência é
 * a mesma classe de erro que inventar métrica — só troca o número pela
 * habilidade, e o candidato descobre na entrevista.
 */
const BodySchema = z.object({
  tipo: z.enum(["experiencia", "formacao", "projeto", "atividade"]),
  /** O que já está preenchido, rotulado. Ex: { Empresa: "...", Cargo: "..." } */
  campos: z.record(z.string(), z.string()).refine(
    (c) => Object.values(c).some((v) => v.trim().length > 0),
    "Preencha ao menos um campo antes de pedir as perguntas.",
  ),
  /** Perguntas já respondidas antes — para não repetir. */
  jaPerguntado: z.array(z.string()).max(30).optional(),
});

/** Áreas que o formulário tenta cobrir, por tipo de item. */
const AREAS: Record<z.infer<typeof BodySchema>["tipo"], string> = {
  experiencia:
    "dinheiro/valores manuseados, equipe e treinamento de outros, resolução de problema real, rotina de início e fim de turno, mudança de responsabilidade ao longo do tempo, ferramentas e sistemas usados",
  formacao:
    "projetos e trabalhos práticos, atividades extracurriculares (eventos, grupos, representação), monitoria ou pesquisa, tecnologias aprendidas na prática, trabalho em grupo, reconhecimento (nota de destaque, prêmio, publicação)",
  projeto:
    "problema que motivou o projeto, decisões técnicas tomadas, o que deu errado e como contornou, quem mais participou, resultado ou uso real, tecnologias além das óbvias",
  atividade:
    "o que a função envolvia na prática, com quem interagia, iniciativa própria versus tarefa atribuída, preparo ou treinamento recebido, duração e frequência, reconhecimento",
};

export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const { tipo, campos, jaPerguntado } = BodySchema.parse(await request.json());

    const preenchido = Object.entries(campos)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v.trim()}`)
      .join("\n");

    const prompt = `${contextoDeData()}

Você ajuda alguém a lembrar o que fez, para o currículo não perder informação
real. A pessoa acabou de cadastrar um item e escreveu só o que lembrou na hora.

O QUE ELA ESCREVEU:
${preenchido}

TAREFA: gere um formulário de 5 a 6 perguntas para extrair o que ela
provavelmente fez e esqueceu de registrar.

REGRAS:
- Pergunte sobre o que JÁ ACONTECEU. Nunca hipotético ("o que você faria se")
  — resposta hipotética é fato inventado com cara de fato.
- NÃO sugira a resposta dentro da pergunta. Errado: "você fazia controle de
  estoque?" (a pessoa concorda por conveniência). Certo: "o que acontecia
  quando acabava algum item no meio do turno?" (a resposta revela o que é
  verdade, inclusive quando a resposta é "nada, eu avisava o gerente").
- Cada pergunta mira uma área DIFERENTE que o texto acima não cobre. Áreas
  deste tipo de item: ${AREAS[tipo]}.
- No máximo UMA pergunta pede número, e ela deve dizer explicitamente que
  deixar em branco é melhor que chutar.
- Não pergunte o que já está escrito acima.
- Português do Brasil. Perguntas curtas e diretas, uma ideia por pergunta.
${
  jaPerguntado?.length
    ? `\nJÁ PERGUNTADO ANTES (não repita, nem reformule):\n${jaPerguntado.map((p) => `- ${p}`).join("\n")}`
    : ""
}

Para cada pergunta, informe também a "area" — em 2 a 4 palavras, o que ela
tenta recuperar (ex.: "manuseio de dinheiro", "treinamento de equipe").`;

    const resultado = await generateStructured({
      model: MODELS.fast,
      schema: PerguntasItemSchema,
      prompt,
      temperature: 0.4,
      // O 2.5-flash gasta tokens de "thinking" do mesmo orçamento da resposta.
      maxOutputTokens: 4096,
    });

    if (resultado.perguntas.length === 0) {
      return fail("A IA não gerou perguntas. Tente de novo.");
    }

    return ok(resultado);
  });
}
