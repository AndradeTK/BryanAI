import { cursoRepo } from "@/server/db/repositories";
import type { Curso } from "@/server/db/schema";
import { saveCurso, deleteCurso } from "./actions";
import { CrudList, type FieldSpec } from "@/components/CrudList";

export const dynamic = "force-dynamic";

const FIELDS: FieldSpec[] = [
  { kind: "text", name: "tituloDoCurso", label: "Título do curso", required: true },
  { kind: "text", name: "emissorInstituicao", label: "Emissor / Instituição" },
  { kind: "url", name: "link", label: "Link do certificado", placeholder: "https://..." },
  { kind: "textarea", name: "descricao", label: "Descrição" , ia: "descricao" },
  { kind: "checkbox", name: "destaque", label: "Marcar como destaque" },
];

export default async function CursosPage() {
  const items = await cursoRepo.getAll();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Certificações</h1>
      <p className="text-content-subtle mb-6">
        Cursos e certificações. Adicione o link do certificado quando houver.
      </p>

      <CrudList
        saveAction={saveCurso}
        deleteAction={deleteCurso}
        addLabel="Adicionar certificação"
        fields={FIELDS}
        emptyValues={{ destaque: false }}
        rows={items.map((c: Curso) => ({
          id: c.id,
          summary: {
            title: c.tituloDoCurso ?? "",
            badge: c.destaque ? { text: "Destaque", tone: "primary" as const } : undefined,
            subtitle: c.emissorInstituicao ?? undefined,
            meta: c.descricao ?? undefined,
            link: c.link,
          },
          values: {
            tituloDoCurso: c.tituloDoCurso ?? undefined,
            emissorInstituicao: c.emissorInstituicao ?? undefined,
            link: c.link ?? undefined,
            descricao: c.descricao ?? undefined,
            destaque: c.destaque ?? false,
          },
        }))}
      />
    </div>
  );
}
