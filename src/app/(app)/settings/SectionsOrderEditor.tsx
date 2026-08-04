"use client";

import { useState, useTransition } from "react";
import { saveSectionsOrder } from "./actions";

const LABELS: Record<string, string> = {
  summary: "Resumo profissional",
  experience: "Experiências",
  skills: "Habilidades",
  education: "Formação",
  certifications: "Certificações",
  languages: "Idiomas",
  projects: "Projetos",
};

export function SectionsOrderEditor({ initial }: { initial: string[] }) {
  const [order, setOrder] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setSaved(false);
  }

  function salvar() {
    startTransition(async () => {
      await saveSectionsOrder(order);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {order.map((sec, i) => (
          <li
            key={sec}
            className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
          >
            <span className="text-content">
              {i + 1}. {LABELS[sec] ?? sec}
            </span>
            <span className="flex gap-1">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="px-2 py-0.5 text-content-subtle hover:text-content disabled:opacity-30"
                aria-label="Subir"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                className="px-2 py-0.5 text-content-subtle hover:text-content disabled:opacity-30"
                aria-label="Descer"
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={pending}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar ordem"}
        </button>
        {saved && <span className="text-sm text-green-600">Ordem salva.</span>}
      </div>
    </div>
  );
}
