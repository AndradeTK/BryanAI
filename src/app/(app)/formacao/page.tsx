import { formacaoRepo, anexoRepo } from "@/server/db/repositories";
import type { FormacaoProjeto } from "@/server/db/schema";
import {
  saveFormacao,
  deleteFormacao,
  reorderFormacoes,
  addAnexoFormacao,
  removeAnexoFormacao,
} from "./actions";
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
      { value: "atividade", label: "Atividade extracurricular / Liderança" },
    ],
  },
  { kind: "text", name: "instituicaoProjeto", label: "Instituição / Projeto", required: true },
  { kind: "text", name: "tituloCurso", label: "Título / Curso" },
  {
    kind: "text",
    name: "papel",
    label: "Papel (atividades)",
    placeholder: "Embaixador, Monitor, Voluntário...",
    half: true,
  },
  { kind: "text", name: "status", label: "Status", placeholder: "Concluído / Em andamento", half: true },
  { kind: "text", name: "periodoInicio", label: "Início", placeholder: "09/2025", half: true },
  { kind: "text", name: "periodoFim", label: "Fim (vazio = atual)", placeholder: "12/2026", half: true },
  { kind: "url", name: "link", label: "Link (repo/demo/diploma)", placeholder: "https://..." },
  { kind: "textarea", name: "descricaoDetalhada", label: "Descrição detalhada" , ia: "descricao" },
  {
    kind: "checkbox",
    name: "noCanada",
    label: "Feito no Canadá (conta como experiência canadense)",
  },
];

/** "09/2025 — atual" quando não há fim; vazio quando não há período. */
function periodoLabel(inicio: string | null, fim: string | null): string {
  if (!inicio && !fim) return "";
  if (inicio && !fim) return `${inicio} — atual`;
  return [inicio, fim].filter(Boolean).join(" — ");
}

const TIPO_LABEL: Record<string, { text: string; tone: "primary" | "neutral" }> = {
  projeto: { text: "Projeto", tone: "primary" },
  atividade: { text: "Atividade", tone: "primary" },
  educacao: { text: "Educação", tone: "neutral" },
};

export default async function FormacaoPage() {
  const [items, anexos] = await Promise.all([
    formacaoRepo.getAll(),
    anexoRepo.getAllBy("formacao"),
  ]);

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
        addAnexoAction={addAnexoFormacao}
        removeAnexoAction={removeAnexoFormacao}
        addLabel="Adicionar item"
        fields={FIELDS}
        emptyValues={{ tipo: "educacao" }}
        rows={items.map((f: FormacaoProjeto) => ({
          id: f.id,
          summary: {
            title: f.papel
              ? `${f.papel} — ${f.tituloCurso || f.instituicaoProjeto || ""}`
              : f.tituloCurso || f.instituicaoProjeto || "",
            badge: TIPO_LABEL[f.tipo] ?? TIPO_LABEL.educacao,
            subtitle: f.instituicaoProjeto ?? undefined,
            meta:
              [periodoLabel(f.periodoInicio, f.periodoFim), f.status]
                .filter(Boolean)
                .join(" · ") || undefined,
            tags: f.noCanada ? ["Canadá"] : undefined,
            anexos: anexos
              .filter((a) => a.entidadeId === f.id)
              .map((a) => ({
                id: a.id,
                rotulo: a.rotulo,
                href: a.url ?? `/api/arquivos/${a.filename}`,
              })),
            link: f.link,
          },
          values: {
            tipo: f.tipo ?? "educacao",
            instituicaoProjeto: f.instituicaoProjeto ?? undefined,
            tituloCurso: f.tituloCurso ?? undefined,
            status: f.status ?? undefined,
            link: f.link ?? undefined,
            descricaoDetalhada: f.descricaoDetalhada ?? undefined,
            papel: f.papel ?? undefined,
            periodoInicio: f.periodoInicio ?? undefined,
            periodoFim: f.periodoFim ?? undefined,
            noCanada: f.noCanada,
          },
        }))}
      />
    </div>
  );
}
