"use client";

import { useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Progresso } from "@/components/Progresso";
import type { CoverLetterImprovement } from "@/server/ai/schemas";

const TONS = [
  { id: "formal", label: "Formal" },
  { id: "entusiasmado", label: "Entusiasmado" },
  { id: "confiante", label: "Confiante" },
];

type Aba = "gerar" | "melhorar";

export function CoverLetterClient() {
  const [aba, setAba] = useState<Aba>("gerar");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-line">
        <TabButton active={aba === "gerar"} onClick={() => setAba("gerar")}>
          Gerar nova
        </TabButton>
        <TabButton active={aba === "melhorar"} onClick={() => setAba("melhorar")}>
          Melhorar existente
        </TabButton>
      </div>
      {aba === "gerar" ? <GerarTab /> : <MelhorarTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? "border-primary-600 text-primary-600"
          : "border-transparent text-content-subtle hover:text-content-muted"
      }`}
    >
      {children}
    </button>
  );
}

function GerarTab() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [tom, setTom] = useState("formal");
  const [idioma, setIdioma] = useState("pt-BR");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carta, setCarta] = useState<string | null>(null);

  async function gerar() {
    if (!titulo || !descricao) return setErro("Preencha título e descrição da vaga.");
    setLoading(true);
    setErro(null);
    try {
      const res = await fetchWithTimeout("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, empresa, tom, idioma }),
      });
      const data = await res.json();
      if (data.success) setCarta(data.data.coverLetter);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
        <input
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          placeholder="Título da vaga"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          placeholder="Empresa (opcional)"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          rows={8}
          placeholder="Cole a descrição da vaga"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="rounded-lg border border-line px-3 py-2 text-sm bg-surface"
            value={tom}
            onChange={(e) => setTom(e.target.value)}
          >
            {TONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-line px-3 py-2 text-sm bg-surface"
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
          >
            <option value="pt-BR">Português</option>
            <option value="en">Inglês</option>
            <option value="fr">Francês</option>
          </select>
        </div>
        {erro && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-2 text-sm">{erro}</div>
        )}
        <button
          onClick={gerar}
          disabled={loading}
          className="px-4 py-2 bg-accent text-on-accent rounded-full text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Gerando..." : "Gerar Cover Letter"}
        </button>
        <Progresso ativo={loading} className="mt-4" />
      </div>

      <div className="bg-surface rounded-xl border border-line p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-content">Carta</h2>
          {carta && (
            <button
              onClick={() => navigator.clipboard.writeText(carta)}
              className="text-sm text-primary-600 hover:underline"
            >
              Copiar
            </button>
          )}
        </div>
        {carta ? (
          <pre className="whitespace-pre-wrap text-sm text-content-muted font-sans">
            {carta}
          </pre>
        ) : (
          <p className="text-content-subtle text-sm">
            A cover letter gerada aparecerá aqui.
          </p>
        )}
      </div>
    </div>
  );
}

function MelhorarTab() {
  const [coverLetter, setCoverLetter] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [result, setResult] = useState<CoverLetterImprovement | null>(null);

  async function melhorar() {
    if (!coverLetter || !titulo || !descricao)
      return setErro("Cole sua carta, o título e a descrição da vaga.");
    setLoading(true);
    setErro(null);
    try {
      const res = await fetchWithTimeout("/api/cover-letter/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter, titulo, descricao }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao melhorar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
        <input
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          placeholder="Título da vaga"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          rows={4}
          placeholder="Descrição da vaga"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          rows={8}
          placeholder="Cole a cover letter que você quer melhorar"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />
        {erro && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-2 text-sm">{erro}</div>
        )}
        <button
          onClick={melhorar}
          disabled={loading}
          className="px-4 py-2 bg-accent text-on-accent rounded-full text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Analisando..." : "Melhorar carta"}
        </button>
        <Progresso ativo={loading} className="mt-4" />
      </div>

      <div className="bg-surface rounded-xl border border-line p-6">
        {!result ? (
          <p className="text-content-subtle text-sm">
            A versão melhorada e as sugestões aparecerão aqui.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-content-subtle">
                Score: <strong className="text-red-600">{result.score_original}</strong>{" "}
                → <strong className="text-green-600">{result.score_melhorado}</strong>
              </span>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-semibold text-content">Versão melhorada</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(result.versao_melhorada)}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Copiar
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-content-muted font-sans bg-surface-2 rounded-lg p-3">
                {result.versao_melhorada}
              </pre>
            </div>
            {result.melhorias.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-content mb-2">
                  O que mudou
                </h3>
                <ul className="space-y-2">
                  {result.melhorias.map((m, i) => (
                    <li key={i} className="text-xs border-l-2 border-primary-300 pl-3">
                      <p className="text-content-subtle line-through">{m.original}</p>
                      <p className="text-content">{m.sugestao}</p>
                      <p className="text-content-subtle italic">{m.motivo}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
