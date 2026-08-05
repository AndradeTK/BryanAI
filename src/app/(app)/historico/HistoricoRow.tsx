"use client";

import { useState, useTransition } from "react";
import type { HistoricoGeracao } from "@/server/db/schema";
import { deleteHistorico } from "./actions";

const STATUS_CLS: Record<string, string> = {
  concluido: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  falha: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  processando:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export function HistoricoRow({ registro }: { registro: HistoricoGeracao }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const cls = STATUS_CLS[registro.status ?? ""] ?? "bg-surface-3 text-content-muted";

  /**
   * Análise e geração gravam nesta mesma tabela; só a geração produz arquivo.
   * Sem distinguir, a lista virava um monte de linhas iguais com a coluna de
   * download vazia, e não dava para saber se o currículo tinha falhado ou se
   * aquilo nunca foi uma geração.
   */
  const ehGeracao = registro.pdfPath !== null;

  function remover() {
    startTransition(() => deleteHistorico(registro.id));
  }

  return (
    <tr className="border-b border-line-soft">
      <td className="py-2 pr-4 text-content">{registro.vagaTitulo ?? "—"}</td>
      <td className="py-2 pr-4">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            ehGeracao
              ? "bg-blue-soft text-blue"
              : "bg-surface-3 text-content-muted"
          }`}
        >
          {ehGeracao ? "Currículo" : "Análise"}
        </span>
      </td>
      <td className="py-2 pr-4">{registro.score ?? "—"}</td>
      <td className="py-2 pr-4">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {registro.status ?? "—"}
        </span>
      </td>
      <td className="py-2 pr-4 text-content-subtle">
        {registro.createdAt?.toLocaleDateString("pt-BR")}
      </td>
      <td className="py-2 pr-4">
        {ehGeracao ? (
          <a
            href={`/api/arquivos/${registro.pdfPath}?download=true`}
            className="text-blue hover:underline"
          >
            Baixar
          </a>
        ) : (
          <span className="text-content-subtle" title="Análises não geram arquivo">
            —
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {confirming ? (
          <span className="inline-flex gap-2">
            <button
              onClick={remover}
              disabled={pending}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              {pending ? "Removendo..." : "Confirmar"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-content-subtle hover:underline"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs text-content-subtle hover:text-red-600"
          >
            Excluir
          </button>
        )}
      </td>
    </tr>
  );
}
