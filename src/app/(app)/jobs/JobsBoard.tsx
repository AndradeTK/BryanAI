"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { moveApplication, addManualJob, type ActionState } from "./actions";
import { JobDetailModal } from "./JobDetailModal";

type Status = "saved" | "applied" | "interview" | "offer" | "rejected" | "archived";

interface BoardItem {
  id: number;
  jobId: number;
  status: Status;
  score: number | null;
  notes: string | null;
  titulo: string;
  empresa: string | null;
  descricao: string;
  url: string | null;
  localizacao: string | null;
  nocCode: string | null;
  salaryRaw: string | null;
  datePosted: string | null;
  analysis: {
    work_auth_verdict?: string;
    language_verdict?: string;
    regulated_gap?: string | null;
    noc_suggestion?: { code: string; confidence: number } | null;
  } | null;
}

const COLUNAS: { status: Status; label: string; cor: string }[] = [
  { status: "saved", label: "Salvas", cor: "border-line" },
  { status: "applied", label: "Aplicadas", cor: "border-blue-300" },
  { status: "interview", label: "Entrevista", cor: "border-purple-300" },
  { status: "offer", label: "Oferta", cor: "border-green-300" },
  { status: "rejected", label: "Rejeitadas", cor: "border-red-300" },
];

export function JobsBoard({ initialBoard }: { initialBoard: BoardItem[] }) {
  const [board, setBoard] = useState<BoardItem[]>(initialBoard);
  const [dragId, setDragId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<BoardItem | null>(null);

  // Sincroniza o estado local quando o servidor revalida (ex.: vaga adicionada
  // via Server Action). Sem isto, o board local ignora a vaga nova.
  const serverIds = initialBoard.map((b) => b.id).join(",");
  const localIds = board.map((b) => b.id).join(",");
  if (serverIds !== localIds && dragId === null) {
    setBoard(initialBoard);
  }

  function onDrop(status: Status) {
    if (dragId == null) return;
    const item = board.find((b) => b.id === dragId);
    if (!item || item.status === status) return;
    // otimista
    setBoard((prev) =>
      prev.map((b) => (b.id === dragId ? { ...b, status } : b)),
    );
    startTransition(() => moveApplication(dragId, status));
    setDragId(null);
  }

  async function pontuarTodas() {
    setScoring(true);
    setMsg(null);
    try {
      const res = await fetchWithTimeout(
        "/api/jobs/batch-score",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        120000,
      );
      const data = await res.json();
      if (data.success) {
        setMsg(`${data.data.pontuadas} vaga(s) pontuada(s). Recarregue para ver os scores.`);
      } else setMsg(data.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao pontuar.");
    } finally {
      setScoring(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          {showForm ? "Fechar" : "Adicionar vaga manual"}
        </button>
        <button
          onClick={pontuarTodas}
          disabled={scoring}
          className="px-4 py-2 bg-surface-3 text-content rounded-lg text-sm font-medium hover:bg-surface-3 disabled:opacity-60"
        >
          {scoring ? "Pontuando..." : "Pontuar todas (top-K)"}
        </button>
        {msg && <span className="text-sm text-content-muted">{msg}</span>}
      </div>

      {showForm && <ManualForm onDone={() => setShowForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
        {COLUNAS.map((col) => {
          const items = board.filter((b) => b.status === col.status);
          return (
            <div
              key={col.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.status)}
              className={`bg-surface-2 rounded-xl border-t-4 ${col.cor} border border-line p-3 min-h-[200px]`}
            >
              <h2 className="text-sm font-semibold text-content-muted mb-3 flex justify-between">
                {col.label}
                <span className="text-content-subtle">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    className="bg-surface rounded-lg border border-line p-3 cursor-grab active:cursor-grabbing shadow-sm"
                  >
                    <p className="text-sm font-medium text-content leading-snug">
                      {item.titulo}
                    </p>
                    {item.empresa && (
                      <p className="text-xs text-content-subtle">
                        {item.empresa}
                        {item.localizacao ? ` · ${item.localizacao}` : ""}
                      </p>
                    )}
                    {(item.salaryRaw || item.datePosted) && (
                      <p className="text-xs text-content-subtle mt-0.5">
                        {item.salaryRaw}
                        {item.salaryRaw && item.datePosted ? " · " : ""}
                        {item.datePosted}
                      </p>
                    )}
                    {item.analysis?.work_auth_verdict ===
                      "needs_sponsorship_blocker" && (
                      <p className="text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded px-1.5 py-0.5 mt-1.5">
                        ⚠️ Exige autorização que você não tem
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {item.score != null && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            item.score >= 80
                              ? "bg-green-100 text-green-700"
                              : item.score >= 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.score}
                        </span>
                      )}
                      {item.nocCode && (
                        <span className="text-xs text-content-subtle">NOC {item.nocCode}</span>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary-600 hover:underline"
                        >
                          abrir
                        </a>
                      )}
                      <button
                        onClick={() => setDetailItem(item)}
                        className="text-xs text-content-subtle hover:text-content ml-auto"
                      >
                        detalhes
                      </button>
                    </div>
                  </article>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-content-subtle py-4 text-center">vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailItem && (
        <JobDetailModal
          appId={detailItem.id}
          titulo={detailItem.titulo}
          descricao={detailItem.descricao}
          notes={detailItem.notes}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(addManualJob, {});
  if (state.success) onDone();
  return (
    <form
      action={action}
      className="bg-surface rounded-xl border border-line p-4 space-y-3 mt-2"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          name="titulo"
          required
          placeholder="Título da vaga"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
        <input
          name="empresa"
          placeholder="Empresa (opcional)"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>
      <input
        name="url"
        placeholder="URL da vaga (opcional)"
        className="w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      <textarea
        name="descricao"
        required
        rows={5}
        placeholder="Cole a descrição da vaga"
        className="w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
      >
        Salvar vaga
      </button>
    </form>
  );
}
