"use client";

import { useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { SkillsGap, MarketAnalysis, StudyPlan } from "@/server/ai/schemas";

export function SkillsGapClient() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [result, setResult] = useState<SkillsGap | null>(null);

  // Plano de estudos (derivado dos gaps)
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [horas, setHoras] = useState(10);
  const [loadingPlano, setLoadingPlano] = useState(false);

  // Análise de mercado (por área)
  const [area, setArea] = useState("");
  const [market, setMarket] = useState<MarketAnalysis | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);

  async function analisar() {
    if (!titulo) return setErro("Informe o cargo/vaga alvo.");
    setLoading(true);
    setErro(null);
    setPlano(null);
    try {
      const res = await fetchWithTimeout("/api/skills-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao analisar.");
    } finally {
      setLoading(false);
    }
  }

  async function gerarPlano() {
    if (!result) return;
    setLoadingPlano(true);
    setErro(null);
    try {
      const res = await fetchWithTimeout(
        "/api/skills-gap/study-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gaps: result.gaps_identificados,
            horasPorSemana: horas,
          }),
        },
        60000,
      );
      const data = await res.json();
      if (data.success) setPlano(data.data);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar plano.");
    } finally {
      setLoadingPlano(false);
    }
  }

  async function analisarMercado() {
    if (!area) return setErro("Informe a área do mercado.");
    setLoadingMarket(true);
    setErro(null);
    try {
      const res = await fetchWithTimeout("/api/skills-gap/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area }),
      });
      const data = await res.json();
      if (data.success) setMarket(data.data);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao analisar mercado.");
    } finally {
      setLoadingMarket(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
        <input
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          placeholder="Cargo ou vaga alvo (ex.: Desenvolvedor Full Stack Sênior)"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          rows={4}
          placeholder="Descrição da vaga (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        {erro && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-2 text-sm">{erro}</div>
        )}
        <button
          onClick={analisar}
          disabled={loading}
          className="px-4 py-2 bg-accent text-on-accent rounded-full text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Analisando..." : "Analisar Skills Gap"}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-line p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-full bg-accent text-on-accent flex items-center justify-center text-lg font-bold">
                {result.analise_geral.score_compatibilidade}
              </div>
              <div>
                <p className="font-semibold text-content">
                  {result.analise_geral.nivel_atual} → {result.analise_geral.nivel_alvo}
                </p>
                <p className="text-xs text-content-subtle">
                  Transição estimada: {result.analise_geral.tempo_estimado_transicao}
                </p>
              </div>
            </div>
            <p className="text-sm text-content-muted">{result.analise_geral.resumo}</p>
          </div>

          <div className="bg-surface rounded-xl border border-line p-6">
            <h2 className="text-lg font-semibold text-content mb-3">
              Gaps identificados
            </h2>
            <div className="space-y-2">
              {result.gaps_identificados.map((g, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-0.5 text-xs px-2 py-0.5 rounded font-medium ${
                      g.importancia === "Crítica"
                        ? "bg-red-100 text-red-700"
                        : g.importancia === "Alta"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-surface-3 text-content-muted"
                    }`}
                  >
                    {g.importancia}
                  </span>
                  <div>
                    <span className="font-medium text-content">{g.habilidade}</span>
                    <span className="text-content-subtle"> — {g.descricao}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[result.roadmap.fase_1, result.roadmap.fase_2, result.roadmap.fase_3].map(
              (fase, i) => (
                <div key={i} className="bg-surface rounded-xl border border-line p-5">
                  <p className="text-xs text-primary-600 font-medium">Fase {i + 1}</p>
                  <h3 className="font-semibold text-content mt-1">{fase.titulo}</h3>
                  <p className="text-xs text-content-subtle mb-2">{fase.duracao}</p>
                  <ul className="space-y-1">
                    {fase.recursos.map((r, j) => (
                      <li key={j} className="text-xs text-content-muted">
                        • {r.nome}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>

          {/* Plano de estudos de 12 semanas — derivado dos gaps */}
          <div className="bg-surface rounded-xl border border-line p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-content">
                Plano de estudos (12 semanas)
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-content-subtle">Horas/semana</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={horas}
                  onChange={(e) => setHoras(Number(e.target.value))}
                  className="w-16 rounded-lg border border-line px-2 py-1 text-sm"
                />
                <button
                  onClick={gerarPlano}
                  disabled={loadingPlano}
                  className="px-3 py-1.5 bg-accent text-on-accent rounded-full text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
                >
                  {loadingPlano ? "Gerando..." : "Gerar plano"}
                </button>
              </div>
            </div>
            {plano ? (
              <div className="space-y-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plano.plano_semanal.map((s) => (
                    <div key={s.semana} className="border-l-2 border-primary-300 pl-3">
                      <p className="text-sm font-medium text-content">
                        Semana {s.semana}: {s.foco}
                      </p>
                      <p className="text-xs text-content-subtle mb-1">Meta: {s.meta}</p>
                      <ul className="space-y-0.5">
                        {s.atividades.map((a, i) => (
                          <li key={i} className="text-xs text-content-muted">
                            {a.dia} ({a.duracao}): {a.atividade}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {plano.dicas_produtividade.length > 0 && (
                  <div className="text-xs text-content-subtle">
                    <span className="font-medium">Dicas:</span>{" "}
                    {plano.dicas_produtividade.join(" · ")}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-content-subtle text-sm">
                Gere um plano semanal detalhado a partir dos gaps acima.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Análise de mercado por área — independente da análise de gap */}
      <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
        <h2 className="text-lg font-semibold text-content">Análise de mercado</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
            placeholder="Área (ex.: Desenvolvimento Full Stack, Data Engineering)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <button
            onClick={analisarMercado}
            disabled={loadingMarket}
            className="px-4 py-2 bg-surface-3 text-content rounded-lg text-sm font-medium hover:bg-surface-3 disabled:opacity-60"
          >
            {loadingMarket ? "Analisando..." : "Analisar"}
          </button>
        </div>
        {market && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-800 text-white flex items-center justify-center text-lg font-bold">
                {market.score_empregabilidade}
              </div>
              <p className="text-sm text-content-muted">{market.posicao_mercado}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-content mb-2">Tendências</h3>
              <div className="flex flex-wrap gap-2">
                {market.tendencias.map((t, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded ${
                      t.candidato_tem
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {t.tecnologia} · {t.status}
                    {t.candidato_tem ? " ✓" : ""}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-content mb-1">Diferenciais</h3>
                <ul className="space-y-0.5 text-content-muted">
                  {market.diferenciais.map((d, i) => (
                    <li key={i} className="text-xs">• {d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-content mb-1">Pontos de atenção</h3>
                <ul className="space-y-0.5 text-content-muted">
                  {market.pontos_atencao.map((p, i) => (
                    <li key={i} className="text-xs">• {p}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-xs text-content-subtle">
              Salário estimado — Júnior: {market.salario_estimado.junior} · Pleno:{" "}
              {market.salario_estimado.pleno} · Sênior: {market.salario_estimado.senior}
              {" "}({market.salario_estimado.posicao_candidato})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
