import type { ReactNode } from "react";

/**
 * Renderizador mínimo do markdown que o modelo produz: negrito, itálico,
 * `código`, listas com marcador ou número, e parágrafos.
 *
 * É escrito à mão em vez de trazer uma biblioteca por dois motivos. O conjunto
 * usado é pequeno e estável — mais de 90% do que aparece é negrito e lista. E,
 * principalmente, isto constrói elementos React: nada de `innerHTML` com texto
 * vindo de um modelo. O pior caso é uma marcação não reconhecida aparecer
 * literal, não uma injeção.
 */

/** Divide uma linha em trechos, tratando **negrito**, *itálico* e `código`. */
function inline(texto: string, chaveBase: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    const chave = `${chaveBase}-${i++}`;

    if (t.startsWith("**")) {
      partes.push(
        <strong key={chave} className="font-medium text-content">
          {t.slice(2, -2)}
        </strong>,
      );
    } else if (t.startsWith("`")) {
      partes.push(
        <code
          key={chave}
          className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.9em] font-mono"
        >
          {t.slice(1, -1)}
        </code>,
      );
    } else {
      partes.push(<em key={chave}>{t.slice(1, -1)}</em>);
    }
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];

  let lista: { ordenada: boolean; itens: string[] } | null = null;
  let paragrafo: string[] = [];

  const fecharLista = () => {
    if (!lista) return;
    const Tag = lista.ordenada ? "ol" : "ul";
    blocos.push(
      <Tag
        key={`l${blocos.length}`}
        className={`my-2 space-y-1 pl-5 ${lista.ordenada ? "list-decimal" : "list-disc"} marker:text-content-subtle`}
      >
        {lista.itens.map((item, i) => (
          <li key={i}>{inline(item, `l${blocos.length}i${i}`)}</li>
        ))}
      </Tag>,
    );
    lista = null;
  };

  const fecharParagrafo = () => {
    if (paragrafo.length === 0) return;
    blocos.push(
      <p key={`p${blocos.length}`} className="my-2 first:mt-0 last:mb-0">
        {inline(paragrafo.join(" "), `p${blocos.length}`)}
      </p>,
    );
    paragrafo = [];
  };

  for (const linha of linhas) {
    const bullet = linha.match(/^\s*[-*•]\s+(.*)$/);
    const numerado = linha.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bullet || numerado) {
      fecharParagrafo();
      const ordenada = Boolean(numerado);
      const conteudo = (bullet ?? numerado)![1];
      if (!lista || lista.ordenada !== ordenada) {
        fecharLista();
        lista = { ordenada, itens: [] };
      }
      lista.itens.push(conteudo);
      continue;
    }

    if (linha.trim() === "") {
      fecharLista();
      fecharParagrafo();
      continue;
    }

    fecharLista();
    paragrafo.push(linha.trim());
  }
  fecharLista();
  fecharParagrafo();

  return <>{blocos}</>;
}
