import { Icone } from "@/components/Icone";

/**
 * Pré-visualização de um arquivo guardado em `/api/arquivos/:nome`.
 *
 * Só PDF renderiza inline. Num iframe, o DOCX dispara download ou fica em
 * branco — pior que não mostrar nada, porque parece defeito.
 *
 * Vive aqui, e não dentro de DocCard, porque a mesma decisão precisa valer
 * para os currículos gerados e para os anexos do usuário. Duas implementações
 * do mesmo julgamento divergem: os anexos ficaram sem preview nenhum até esta
 * extração.
 */
export function DocumentPreview({
  nome,
  titulo,
  altura = "h-64",
}: {
  nome: string;
  /** Vira o title do iframe — o que leitor de tela anuncia. */
  titulo: string;
  altura?: string;
}) {
  const ehPdf = nome.toLowerCase().endsWith(".pdf");
  const extensao = nome.split(".").pop()?.toUpperCase() ?? "arquivo";

  if (ehPdf) {
    return (
      <iframe
        src={`/api/arquivos/${nome}#toolbar=0&navpanes=0`}
        title={titulo}
        className={`w-full ${altura} bg-surface-2 border-b border-line`}
      />
    );
  }

  return (
    <div
      className={`w-full ${altura} bg-surface-2 border-b border-line flex flex-col items-center justify-center gap-2 text-content-subtle`}
    >
      <Icone nome="documentos" tamanho="2rem" />
      <span className="text-xs">{extensao} — sem pré-visualização</span>
    </div>
  );
}
