"use client";

import { useState, useTransition } from "react";
import type { HistoricoGeracao } from "@/server/db/schema";
import { deleteHistorico } from "./actions";

const STATUS_CLS: Record<string, string> = {
  concluido: "bg-green-100 text-green-700",
  falha: "bg-red-100 text-red-700",
  processando: "bg-yellow-100 text-yellow-700",
};

export function HistoricoRow({ registro }: { registro: HistoricoGeracao }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const cls = STATUS_CLS[registro.status ?? ""] ?? "bg-surface-3 text-content-muted";

  function remover() {
    startTransition(() => deleteHistorico(registro.id));
  }

  return (
    <tr className="border-b border-line">
      <td className="py-2 pr-4 text-content">{registro.vagaTitulo ?? "—"}</td>
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
        {registro.pdfPath ? (
          <a
            href={`/api/arquivos/${registro.pdfPath}?download=true`}
            className="text-primary-600 hover:underline"
          >
            Baixar
          </a>
        ) : (
          <span className="text-content-subtle">—</span>
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
