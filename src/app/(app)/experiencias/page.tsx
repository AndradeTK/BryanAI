import { experienciaRepo } from "@/server/db/repositories";
import type { Experiencia } from "@/server/db/schema";
import { saveExperiencia, deleteExperiencia, reorderExperiencias } from "./actions";
import { CrudList, type FieldSpec } from "@/components/CrudList";

export const dynamic = "force-dynamic";

const FIELDS: FieldSpec[] = [
  { kind: "text", name: "empresa", label: "Empresa", required: true },
  { kind: "text", name: "cargo", label: "Cargo", required: true },
  { kind: "date", name: "dataInicio", label: "Data de início" },
  { kind: "date", name: "dataFim", label: "Data de fim (vazio = atual)" },
  { kind: "text", name: "categoria", label: "Categoria", placeholder: "Tecnologia" },
  { kind: "text", name: "tagsTecnicas", label: "Tags técnicas (vírgula)", placeholder: "Node.js, Docker" },
  { kind: "textarea", name: "descricaoAtividades", label: "Descrição das atividades" },
  { kind: "textarea", name: "principaisConquistas", label: "Principais conquistas" },
];

export default async function ExperienciasPage() {
  const items = await experienciaRepo.getAll();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Experiências</h1>
      <p className="text-content-subtle mb-6">
        Sua trajetória profissional. Deixe a data de fim em branco para o emprego
        atual. Use as setas para ordenar como aparecerão no currículo.
      </p>

      <CrudList
        saveAction={saveExperiencia}
        deleteAction={deleteExperiencia}
        reorderAction={reorderExperiencias}
        addLabel="Adicionar experiência"
        fields={FIELDS}
        emptyValues={{}}
        rows={items.map((e: Experiencia) => ({
          id: e.id,
          summary: {
            title: e.cargo,
            subtitle: e.empresa,
            meta: `${e.dataInicio ?? "?"} — ${e.dataFim ?? "Atual"}`,
            tags: e.tagsTecnicas ?? undefined,
          },
          values: {
            empresa: e.empresa,
            cargo: e.cargo,
            dataInicio: e.dataInicio ?? undefined,
            dataFim: e.dataFim ?? undefined,
            categoria: e.categoria ?? undefined,
            tagsTecnicas: e.tagsTecnicas?.join(", "),
            descricaoAtividades: e.descricaoAtividades ?? undefined,
            principaisConquistas: e.principaisConquistas ?? undefined,
          },
        }))}
      />
    </div>
  );
}
