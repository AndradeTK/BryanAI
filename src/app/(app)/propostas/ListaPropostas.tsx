"use client";

import { useState } from "react";
import { CardProposta } from "@/components/CardProposta";
import { aprovarProposta, rejeitarProposta, rejeitarTodas } from "./actions";

interface Item {
  id: number;
  ferramenta: string;
  rotulo: string;
  argumentos: Record<string, unknown>;
  atual: Record<string, unknown> | null;
  origem: string | null;
  quando: string;
}

/**
 * A fila de propostas.
 *
 * "Rejeitar todas" existe e "aprovar todas" não — rejeitar em massa é seguro
 * porque nada é gravado, aprovar em massa seria assinar embaixo de um lote sem
 * ler. É a assimetria que faz a fila valer alguma coisa.
 */
export function ListaPropostas({ itens }: { itens: Item[] }) {
  const [confirmandoTudo, setConfirmandoTudo] = useState(false);

  if (itens.length === 0) {
    return (
      <p className="text-content-subtle text-sm">
        Nenhuma proposta pendente. As alterações sugeridas pelo assistente
        aparecem aqui quando você não as decide na hora.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-content-muted">
          {itens.length} {itens.length === 1 ? "pendente" : "pendentes"}
        </span>
        {confirmandoTudo ? (
          <span className="flex items-center gap-2">
            <form action={rejeitarTodas}>
              <button
                type="submit"
                className="text-xs text-red-600 hover:underline font-medium"
              >
                confirmar rejeição de todas
              </button>
            </form>
            <button
              onClick={() => setConfirmandoTudo(false)}
              className="text-xs text-content-subtle hover:text-content"
            >
              cancelar
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmandoTudo(true)}
            className="text-xs text-content-subtle hover:text-content"
          >
            Rejeitar todas
          </button>
        )}
      </div>

      {itens.map((item) => (
        <div key={item.id}>
          <CardProposta
            proposta={{
              ferramenta: item.ferramenta,
              rotulo: item.rotulo,
              argumentos: item.argumentos,
            }}
            atual={item.atual}
            origem={item.origem}
            quando={item.quando}
          />
          <div className="flex gap-2 mt-2">
            <form action={aprovarProposta}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-accent text-on-accent text-[13px] font-medium hover:bg-accent-hover"
              >
                Aplicar
              </button>
            </form>
            <form action={rejeitarProposta}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                className="px-4 py-2 rounded-full border border-line text-content text-[13px] hover:bg-surface-3"
              >
                Rejeitar
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
