import Link from "next/link";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  { id: "minimalista", label: "Minimalista" },
  { id: "executivo", label: "Executivo" },
  { id: "tech", label: "Tech" },
  { id: "harvard", label: "Harvard" },
  { id: "classico", label: "Clássico" },
];

/**
 * Comparação de templates (#20): mostra os 5 lado a lado com os dados reais do
 * perfil (via /preview/[templateId], que renderiza o MESMO HTML do PDF).
 */
export default function PreviewIndexPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Comparar templates</h1>
      <p className="text-content-subtle mb-6">
        Pré-visualização dos 5 modelos com os seus dados. Clique para ver em tela
        cheia.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-line">
              <span className="text-sm font-medium text-content">{t.label}</span>
              <Link
                href={`/preview/${t.id}`}
                className="text-xs text-primary-600 hover:underline"
              >
                tela cheia
              </Link>
            </div>
            <iframe
              src={`/api/preview/${t.id}`}
              title={t.label}
              className="w-full h-96 bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
