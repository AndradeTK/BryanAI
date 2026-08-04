"use client";

import { useState, useTransition } from "react";
import { Badge, scoreTone } from "@/components/ui";

export function DocCard({
  id,
  nome,
  vaga,
  score,
  data,
  deleteAction,
}: {
  id: number;
  nome: string;
  vaga: string;
  score: number | null;
  data: string;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden flex flex-col">
      {/* Preview do PDF (inline) */}
      <iframe
        src={`/api/arquivos/${nome}#toolbar=0&navpanes=0`}
        title={vaga}
        className="w-full h-64 bg-surface-2 border-b border-line"
      />
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-content leading-snug line-clamp-2">
            {vaga}
          </p>
          {score != null && <Badge tone={scoreTone(score)}>{score}</Badge>}
        </div>
        <p className="text-xs text-content-subtle">{data}</p>
        <div className="flex items-center gap-3 mt-1 text-sm">
          <a
            href={`/api/arquivos/${nome}?download=true`}
            className="text-primary-600 hover:underline"
          >
            Baixar
          </a>
          <a
            href={`/api/arquivos/${nome}`}
            target="_blank"
            rel="noreferrer"
            className="text-content-muted hover:underline"
          >
            Abrir
          </a>
          {confirming ? (
            <span className="ml-auto inline-flex gap-2">
              <button
                onClick={() => startTransition(() => deleteAction(id))}
                disabled={pending}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                {pending ? "..." : "Confirmar"}
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
              className="ml-auto text-xs text-content-subtle hover:text-red-600"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
