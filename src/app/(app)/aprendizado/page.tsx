import { answerRepo } from "@/server/db/repositories";
import type { Answer } from "@/server/db/schema";
import { saveAnswer, deleteAnswer } from "./actions";
import { CrudList, type FieldSpec } from "@/components/CrudList";

export const dynamic = "force-dynamic";

const FIELDS: FieldSpec[] = [
  {
    kind: "text",
    name: "questionLabel",
    label: "Pergunta",
    required: true,
    placeholder: "Are you legally authorized to work in Canada?",
    hint: "O texto como aparece no formulário da vaga — é por ele que o casamento acontece.",
  },
  {
    kind: "textarea",
    name: "answer",
    label: "Resposta",
    rows: 3,
  },
];

export default async function AprendizadoPage() {
  const items = await answerRepo.getAll();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Aprendizado</h1>
      <p className="text-content-subtle mb-6">
        Respostas reaproveitadas nos formulários de candidatura. Quando uma vaga
        pergunta algo que ainda não está aqui, você responde uma vez e a resposta
        passa a ser sugerida nas próximas.
      </p>

      <CrudList
        saveAction={saveAnswer}
        deleteAction={deleteAnswer}
        addLabel="Adicionar resposta"
        fields={FIELDS}
        emptyValues={{}}
        rows={items.map((a: Answer) => ({
          id: a.id,
          summary: {
            title: a.questionLabel,
            subtitle: a.answer.length > 120 ? `${a.answer.slice(0, 120)}…` : a.answer,
            meta: a.updatedAt
              ? `Atualizada em ${new Date(a.updatedAt).toLocaleDateString("pt-BR")}`
              : undefined,
          },
          values: {
            questionLabel: a.questionLabel,
            answer: a.answer,
          },
        }))}
      />
    </div>
  );
}
