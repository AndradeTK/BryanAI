import { idiomaRepo } from "@/server/db/repositories";
import type { Idioma } from "@/server/db/schema";
import { saveIdioma, deleteIdioma } from "./actions";
import { CrudList, type FieldSpec } from "@/components/CrudList";

export const dynamic = "force-dynamic";

const FIELDS: FieldSpec[] = [
  { kind: "text", name: "idioma", label: "Idioma", required: true, placeholder: "Inglês" },
  {
    kind: "text",
    name: "nivelCefr",
    label: "Nível (CEFR)",
    placeholder: "B2 - Avançado",
    hint: "A1/A2 básico · B1/B2 intermediário/avançado · C1/C2 fluente",
  },
  { kind: "text", name: "certificacaoExame", label: "Certificação / Exame" },
  { kind: "url", name: "link", label: "Link do certificado", placeholder: "https://..." },
  { kind: "textarea", name: "historicoDeEscolas", label: "Histórico de escolas", rows: 2 },
];

export default async function IdiomasPage() {
  const items = await idiomaRepo.getAll();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Idiomas</h1>
      <p className="text-content-subtle mb-6">Idiomas e níveis de proficiência.</p>

      <CrudList
        saveAction={saveIdioma}
        deleteAction={deleteIdioma}
        addLabel="Adicionar idioma"
        fields={FIELDS}
        emptyValues={{}}
        rows={items.map((i: Idioma) => ({
          id: i.id,
          summary: {
            title: i.idioma,
            subtitle: i.nivelCefr ?? undefined,
            meta: i.certificacaoExame ?? undefined,
            link: i.link,
          },
          values: {
            idioma: i.idioma,
            nivelCefr: i.nivelCefr ?? undefined,
            certificacaoExame: i.certificacaoExame ?? undefined,
            link: i.link ?? undefined,
            historicoDeEscolas: i.historicoDeEscolas ?? undefined,
          },
        }))}
      />
    </div>
  );
}
