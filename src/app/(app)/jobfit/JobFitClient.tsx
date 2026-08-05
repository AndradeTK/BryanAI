"use client";

import { useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { JobFitAnalysisWithCanada } from "@/server/ai/schemas";

const TEMPLATES = [
  { id: "minimalista", label: "Minimalista" },
  { id: "executivo", label: "Executivo" },
  { id: "tech", label: "Tech" },
  { id: "harvard", label: "Harvard" },
  { id: "classico", label: "Clássico" },
];
const IDIOMAS = [
  { id: "pt-BR", label: "Português" },
  { id: "en", label: "Inglês" },
  { id: "en-CA", label: "Inglês (Canadá)" },
  { id: "fr", label: "Francês" },
  { id: "fr-CA", label: "Francês (Canadá)" },
];

export function JobFitClient({
  defaultTemplate = "minimalista",
  defaultIdioma = "pt-BR",
}: {
  defaultTemplate?: string;
  defaultIdioma?: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [template, setTemplate] = useState(defaultTemplate);
  const [idioma, setIdioma] = useState(defaultIdioma);
  const [loading, setLoading] = useState<null | "analyze" | "generate">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState<JobFitAnalysisWithCanada | null>(null);
  const [metricas, setMetricas] = useState<
    Array<{ experiencia: string; bullet: string; sugestao: string }>
  >([]);

  // Análise de CV externo (upload de arquivo).
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    nota: number;
    positivos: string[];
    melhorias: string[];
    proximos: string;
  } | null>(null);

  async function analisarUpload(file: File) {
    if (!titulo || !descricao)
      return setErro("Preencha título e descrição da vaga antes de enviar o CV.");
    setUploadLoading(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("titulo", titulo);
      fd.append("descricao", descricao);
      fd.append("arquivo", file);
      const res = await fetchWithTimeout("/api/jobfit/upload", { method: "POST", body: fd }, 60000);
      const data = await res.json();
      if (data.success) {
        const a = data.data.analise;
        setUploadResult({
          nota: a.qualidade_curriculo.nota,
          positivos: a.qualidade_curriculo.pontos_positivos,
          melhorias: a.qualidade_curriculo.melhorias_sugeridas,
          proximos: a.sugestao_proximos_passos,
        });
      } else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao analisar o arquivo.");
    } finally {
      setUploadLoading(false);
    }
  }

  async function analisar() {
    if (!titulo || !descricao) return setErro("Preencha título e descrição da vaga.");
    setLoading("analyze");
    setErro(null);
    try {
      const res = await fetchWithTimeout("/api/jobfit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao }),
      });
      const data = await res.json();
      if (data.success) setAnalise(data.data.analise);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao analisar.");
    } finally {
      setLoading(null);
    }
  }

  async function gerar(formato: "pdf" | "docx") {
    if (!titulo || !descricao) return setErro("Preencha título e descrição da vaga.");
    setLoading("generate");
    setErro(null);
    try {
      const res = await fetchWithTimeout(
        "/api/jobfit/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, descricao, formato, idioma, templateId: template }),
        },
        60000,
      );
      const data = await res.json();
      if (data.success) {
        setAnalise(data.data.analise);
        setMetricas(data.data.metricas_a_preencher ?? []);
        const nome = data.data.arquivo?.nome;
        if (nome) window.location.href = `/api/arquivos/${nome}?download=true`;
      } else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Entrada */}
      <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
        <h2 className="text-lg font-semibold text-content">Vaga</h2>
        <input
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          placeholder="Título da vaga"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          rows={10}
          placeholder="Cole a descrição da vaga aqui"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="rounded-lg border border-line px-3 py-2 text-sm bg-surface"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            {TEMPLATES.map((t) => (
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
            {IDIOMAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
        {erro && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-2 text-sm">{erro}</div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={analisar}
            disabled={loading !== null}
            className="px-4 py-2 bg-surface-3 text-content rounded-lg text-sm font-medium hover:bg-surface-3 disabled:opacity-60"
          >
            {loading === "analyze" ? "Analisando..." : "Analisar compatibilidade"}
          </button>
          <button
            onClick={() => gerar("pdf")}
            disabled={loading !== null}
            className="px-4 py-2 bg-accent text-on-accent rounded-full text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            {loading === "generate" ? "Gerando..." : "Gerar PDF"}
          </button>
          <button
            onClick={() => gerar("docx")}
            disabled={loading !== null}
            className="px-4 py-2 bg-surface border border-line text-content rounded-lg text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
          >
            Gerar Word
          </button>
        </div>
      </div>

      {/* Resultado */}
      <div className="space-y-6">
        {metricas.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 p-6">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Métricas a preencher ({metricas.length})
            </h2>
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              O CV foi gerado sem números inventados. Estes bullets ficariam mais
              fortes com uma métrica real — edite o PDF adicionando os valores.
            </p>
            <ul className="space-y-2">
              {metricas.map((m, i) => (
                <li key={i} className="text-sm border-l-2 border-amber-300 dark:border-amber-800 pl-3">
                  <p className="text-content">{m.bullet}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {m.experiencia} — {m.sugestao}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="bg-surface rounded-xl border border-line p-6">
        <h2 className="text-lg font-semibold text-content mb-4">Análise</h2>
        {!analise ? (
          <p className="text-content-subtle text-sm">
            Analise uma vaga para ver o score de compatibilidade, pontos fortes e gaps.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ${
                  analise.score >= 80
                    ? "bg-green-500"
                    : analise.score >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              >
                {analise.score}
              </div>
              <div>
                <p className="font-semibold text-content">
                  {analise.nivel_compatibilidade}
                </p>
                <p className="text-xs text-content-subtle">
                  Probabilidade de entrevista: {analise.probabilidade_entrevista}
                </p>
              </div>
            </div>
            <p className="text-sm text-content-muted">{analise.resumo_executivo}</p>

            {/* Veredictos canadenses (Fase 2) */}
            {analise.canadian && (
              <div className="space-y-1.5">
                {analise.canadian.work_auth_verdict ===
                  "needs_sponsorship_blocker" && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-xs">
                    ⚠️ Esta vaga exige autorização de trabalho no Canadá que você
                    não possui (não patrocina).
                  </div>
                )}
                {analise.canadian.language_verdict === "below_requirement" && (
                  <div className="rounded-lg bg-yellow-50 text-yellow-800 px-3 py-2 text-xs">
                    🇫🇷 Vaga em Quebec exige francês acima do seu nível atual (NCLC).
                  </div>
                )}
                {analise.canadian.regulated_gap && (
                  <div className="rounded-lg bg-orange-50 text-orange-800 px-3 py-2 text-xs">
                    {analise.canadian.regulated_gap}
                  </div>
                )}
              </div>
            )}
            {analise.noc_suggestion && (
              <p className="text-xs text-content-subtle">
                NOC sugerido: <strong>{analise.noc_suggestion.code}</strong>{" "}
                (confiança {Math.round(analise.noc_suggestion.confidence * 100)}%)
              </p>
            )}

            <ResultList
              title="Pontos fortes"
              items={analise.pontos_fortes.map((p) => p.ponto)}
              color="text-green-700"
            />
            <ResultList
              title="Gaps identificados"
              items={analise.gaps_identificados.map((g) => g.gap)}
              color="text-red-700"
            />
            {analise.keywords_match.ausentes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-content-muted mb-1">
                  Keywords ausentes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analise.keywords_match.ausentes.map((k) => (
                    <span
                      key={k}
                      className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>

    {/* Análise de CV externo (upload) */}
    <div className="bg-surface rounded-xl border border-line p-6">
      <h2 className="text-lg font-semibold text-content mb-1">
        Analisar um CV existente
      </h2>
      <p className="text-sm text-content-subtle mb-4">
        Envie um PDF/DOCX para avaliar a qualidade dele contra a vaga acima.
      </p>
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-surface-3 text-content rounded-lg text-sm font-medium cursor-pointer hover:opacity-80">
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          disabled={uploadLoading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) analisarUpload(f);
          }}
        />
        {uploadLoading ? "Analisando..." : "Enviar arquivo (PDF/DOCX)"}
      </label>

      {uploadResult && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-content">
            Nota de qualidade:{" "}
            <strong className="text-primary-600">{uploadResult.nota}/10</strong>
          </p>
          <ResultList
            title="Pontos positivos"
            items={uploadResult.positivos}
            color="text-green-700"
          />
          <ResultList
            title="Melhorias sugeridas"
            items={uploadResult.melhorias}
            color="text-content-muted"
          />
          <p className="text-sm text-content-muted">
            <strong className="text-content">Próximos passos:</strong>{" "}
            {uploadResult.proximos}
          </p>
        </div>
      )}
    </div>
    </div>
  );
}

function ResultList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-content-muted mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className={`text-sm ${color}`}>
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
