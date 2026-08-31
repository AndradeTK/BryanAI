"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Button } from "@/components/ui";

interface Detail {
  events: Array<{ id: number; type: string; createdAt: string | null }>;
  parecidas: Array<{ id: number; titulo: string; empresa: string | null }>;
  curriculos: Array<{
    id: number;
    arquivo: string;
    score: number | null;
    criadoEm: string | null;
  }>;
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
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  /** O contêiner do diálogo — usado para prender o foco e recebê-lo ao abrir. */
  const caixaRef = useRef<HTMLDivElement>(null);
  /** Última versão confirmada pelo servidor — base para saber o que está sujo. */
  const [salvoEm, setSalvoEm] = useState({
    notes: initialNotes ?? "",
    followUp: "",
  });
  const [cover, setCover] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [gerandoCv, setGerandoCv] = useState(false);
  const [erroCv, setErroCv] = useState<string | null>(null);

  function carregar() {
    fetchWithTimeout(`/api/jobs/${appId}`)
      .then((r) => r.json())
      .then((d) => d.success && setDetail(d.data))
      .catch(() => {});
  }

  useEffect(carregar, [appId]);

  // Foco entra no diálogo ao abrir: sem isto ele fica no card que estava
  // atrás, e quem navega por teclado precisaria tabular a página inteira para
  // alcançar o conteúdo que acabou de aparecer.
  useEffect(() => {
    caixaRef.current?.focus();
  }, []);

  /**
   * Gera um currículo JÁ VINCULADO a esta candidatura. É o que diferencia de
   * gerar pela tela de Job Fit: ali o arquivo fica solto, aqui ele passa a
   * responder "qual versão eu mandei para essa vaga".
   */
  async function gerarCurriculo() {
    setGerandoCv(true);
    setErroCv(null);
    try {
      const res = await fetchWithTimeout(
        "/api/jobfit/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, descricao, formato: "pdf", applicationId: appId }),
        },
        240000,
      );
      const d = await res.json();
      if (d.success) carregar();
      else setErroCv(d.error);
    } catch (e) {
      // Mesmo abortando no cliente, a geração costuma concluir no servidor.
      const msg = e instanceof Error ? e.message : "Erro ao gerar.";
      setErroCv(
        msg.includes("demorou demais")
          ? `${msg} Recarregue este painel antes de gerar de novo — o arquivo pode já estar na lista.`
          : msg,
      );
      carregar();
    } finally {
      setGerandoCv(false);
    }
  }

  async function salvarNotas() {
    setSaving(true);
    setErroSalvar(null);
    try {
      const res = await fetchWithTimeout(`/api/jobs/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, followUpDate: followUp || null }),
      });
      const data = await res.json();
      // Antes o resultado era ignorado: numa falha o botão voltava ao normal
      // como se tivesse salvado, e a nota se perdia em silêncio.
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível salvar.");
      }
      setSalvoEm({ notes, followUp });
    } catch (e) {
      setErroSalvar(
        e instanceof Error ? e.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Esc fecha (passando pela checagem de alterações não salvas) e Tab fica
   * preso dentro do modal.
   *
   * Sem o foco preso, tabular a partir do modal desce para os links da página
   * atrás dele — que o leitor de tela anuncia como se estivessem disponíveis,
   * apesar de estarem cobertos pelo overlay.
   */
  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      tentarFechar();
      return;
    }
    if (e.key !== "Tab" || !caixaRef.current) return;

    const focaveis = caixaRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }

  /** Fecha, mas não engole texto que o usuário digitou e não salvou. */
  function tentarFechar() {
    const sujo = notes !== salvoEm.notes || followUp !== salvoEm.followUp;
    if (sujo && !confirm("Você tem alterações não salvas. Fechar mesmo assim?")) {
      return;
    }
    onClose();
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
      onClick={tentarFechar}
    >
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-candidatura"
        tabIndex={-1}
        className="bg-surface rounded-xl border border-line max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={aoTeclar}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="titulo-candidatura" className="text-lg font-semibold text-content">
            {titulo}
          </h2>
          <button
            onClick={tentarFechar}
            className="text-content-subtle hover:text-content"
            aria-label="Fechar"
          >
            ✕
          </button>
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
          {erroSalvar && (
            <p role="alert" className="text-xs text-red-600 mt-2">
              {erroSalvar}
            </p>
          )}
        </section>

        {/* Currículos gerados para ESTA vaga */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-content">
              Currículos desta vaga
            </h3>
            <Button variant="outline" onClick={gerarCurriculo} disabled={gerandoCv}>
              {gerandoCv ? "Gerando..." : "Gerar currículo"}
            </Button>
          </div>

          {erroCv && (
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">{erroCv}</p>
          )}

          {detail?.curriculos?.length ? (
            <ul className="space-y-1.5">
              {detail.curriculos.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 text-sm rounded-lg border border-line-soft px-3 py-2"
                >
                  <span className="text-content-subtle text-xs shrink-0">
                    {/* O primeiro da lista é o mais recente — é o que você
                        provavelmente enviou. */}
                    {i === 0 ? "mais recente" : `v${detail.curriculos.length - i}`}
                  </span>
                  <span className="text-content-muted text-xs">
                    {c.criadoEm
                      ? new Date(c.criadoEm).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                  {c.score != null && (
                    <span className="text-xs text-content-subtle">score {c.score}</span>
                  )}
                  <a
                    href={`/api/arquivos/${c.arquivo}?download=true`}
                    className="ml-auto text-blue hover:underline text-xs"
                  >
                    Baixar
                  </a>
                  <a
                    href={`/api/arquivos/${c.arquivo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-content-muted hover:underline text-xs"
                  >
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-content-subtle">
              Nenhum currículo gerado para esta vaga ainda.
            </p>
          )}
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
