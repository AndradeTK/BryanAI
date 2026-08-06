import { formacaoRepo } from "@/server/db/repositories";
import type { FormacaoProjeto } from "@/server/db/schema";
import { saveFormacao, deleteFormacao, reorderFormacoes } from "./actions";
import { CrudList, type FieldSpec } from "@/components/CrudList";

export const dynamic = "force-dynamic";

const FIELDS: FieldSpec[] = [
  {
    kind: "select",
    name: "tipo",
    label: "Tipo",
    options: [
      { value: "educacao", label: "Educação" },
      { value: "projeto", label: "Projeto Pessoal / Freelance" },
    ],
  },
  { kind: "text", name: "instituicaoProjeto", label: "Instituição / Projeto", required: true },
  { kind: "text", name: "tituloCurso", label: "Título / Curso" },
  { kind: "text", name: "status", label: "Status", placeholder: "Concluído / Em andamento" },
  { kind: "url", name: "link", label: "Link (repo/demo/diploma)", placeholder: "https://..." },
  { kind: "textarea", name: "descricaoDetalhada", label: "Descrição detalhada" , ia: "descricao" },
];

export default async function FormacaoPage() {
  const items = await formacaoRepo.getAll();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Formação e Projetos</h1>
      <p className="text-content-subtle mb-6">
        Formação acadêmica e projetos. Use as setas para ordenar como aparecerão no
        currículo.
      </p>

      <CrudList
        saveAction={saveFormacao}
        deleteAction={deleteFormacao}
        reorderAction={reorderFormacoes}
        addLabel="Adicionar item"
        fields={FIELDS}
        emptyValues={{ tipo: "educacao" }}
        rows={items.map((f: FormacaoProjeto) => ({
          id: f.id,
          summary: {
            title: f.tituloCurso || f.instituicaoProjeto || "",
            badge: {
              text: f.tipo === "projeto" ? "Projeto" : "Educação",
              tone: (f.tipo === "projeto" ? "primary" : "neutral") as "primary" | "neutral",
            },
            subtitle: f.instituicaoProjeto ?? undefined,
            meta: f.status ?? undefined,
            link: f.link,
          },
          values: {
            tipo: f.tipo ?? "educacao",
            instituicaoProjeto: f.instituicaoProjeto ?? undefined,
            tituloCurso: f.tituloCurso ?? undefined,
            status: f.status ?? undefined,
            link: f.link ?? undefined,
            descricaoDetalhada: f.descricaoDetalhada ?? undefined,
          },
        }))}
      />
    </div>
  );
}
