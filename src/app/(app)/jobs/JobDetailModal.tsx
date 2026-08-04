"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Button } from "@/components/ui";

interface Detail {
  events: Array<{ id: number; type: string; createdAt: string | null }>;
  parecidas: Array<{ id: number; titulo: string; empresa: string | null }>;
}

const EVENT_LABEL: Record<string, string> = {
  created: "Adicionada",
  status_changed: "Status alterado",
};

/** Painel de detalhe da candidatura: timeline (#10), vagas parecidas (#13), notas (#9). */
export function JobDetailModal({
  appId,
  titulo,
  descricao,
  notes: initialNotes,
  onClose,
}: {
  appId: number;
  titulo: string;
  descricao: string;
  notes: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);

  useEffect(() => {
    fetchWithTimeout(`/api/jobs/${appId}`)
      .then((r) => r.json())
      .then((d) => d.success && setDetail(d.data))
      .catch(() => {});
  }, [appId]);

  async function salvarNotas() {
    setSaving(true);
    try {
      await fetchWithTimeout(`/api/jobs/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, followUpDate: followUp || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function gerarCover() {
    setCoverLoading(true);
    try {
      const res = await fetchWithTimeout(
        "/api/cover-letter",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, descricao }),
        },
        60000,
      );
      const d = await res.json();
      if (d.success) setCover(d.data.coverLetter);
    } finally {
      setCoverLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl border border-line max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-content">{titulo}</h2>
          <button onClick={onClose} className="text-content-subtle hover:text-content">✕</button>
        </div>

        {/* Notas + follow-up (#9) */}
        <section className="mb-5">
          <h3 className="text-sm font-semibold text-content mb-2">Notas</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anotações, contatos, próximos passos..."
            className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-surface outline-none"
          />
          <div className="flex items-center gap-3 mt-2">
            <label className="text-xs text-content-muted">Follow-up:</label>
            <input
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="rounded-lg border border-line px-2 py-1 text-sm bg-surface"
            />
            <Button onClick={salvarNotas} disabled={saving} className="ml-auto">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </section>

        {/* Cover letter do card (#14) */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-content">Cover letter</h3>
            <Button variant="outline" onClick={gerarCover} disabled={coverLoading}>
              {coverLoading ? "Gerando..." : "Gerar para esta vaga"}
            </Button>
          </div>
          {cover && (
            <pre className="whitespace-pre-wrap text-sm text-content-muted bg-surface-2 rounded-lg p-3 max-h-48 overflow-y-auto">
              {cover}
            </pre>
          )}
        </section>

        {/* Timeline (#10) */}
        <section className="mb-5">
          <h3 className="text-sm font-semibold text-content mb-2">Histórico</h3>
          {detail?.events.length ? (
            <ul className="space-y-1">
              {detail.events.map((e) => (
                <li key={e.id} className="text-xs text-content-muted flex gap-2">
                  <span className="text-content-subtle">
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString("pt-BR") : ""}
                  </span>
                  {EVENT_LABEL[e.type] ?? e.type}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-content-subtle">Sem eventos.</p>
          )}
        </section>

        {/* Vagas parecidas (#13) */}
        {detail?.parecidas.length ? (
          <section>
            <h3 className="text-sm font-semibold text-content mb-2">Vagas parecidas</h3>
            <ul className="space-y-1">
              {detail.parecidas.map((p) => (
                <li key={p.id} className="text-sm text-content-muted">
                  {p.titulo}
                  {p.empresa ? ` — ${p.empresa}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
