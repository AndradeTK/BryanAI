"use client";

import { useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Progresso } from "@/components/Progresso";
import { Icone } from "@/components/Icone";
import { Badge } from "@/components/ui";

interface Pergunta {
  pergunta: string;
  categoria: "tecnica" | "comportamental" | "sobre_a_vaga" | "autorizacao_e_mudanca";
  porque_perguntam: string;
  ancora: string | null;
  roteiro: string;
  ponto_fraco: boolean;
}

interface Preparo {
  resumo_da_conversa: string;
  perguntas: Pergunta[];
  perguntas_para_fazer: string[];
  pontos_a_evitar: string[];
  preparo_pratico: string[];
}

const CATEGORIA: Record<Pergunta["categoria"], string> = {
  tecnica: "Técnica",
  comportamental: "Comportamental",
  sobre_a_vaga: "Sobre a vaga",
  autorizacao_e_mudanca: "Autorização / mudança",
};

export function EntrevistaClient({ idiomaPadrao = "pt-BR" }: { idiomaPadrao?: string }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idioma, setIdioma] = useState(idiomaPadrao === "en-CA" ? "en-CA" : "pt-BR");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [preparo, setPreparo] = useState<Preparo | null>(null);
  const [aberta, setAberta] = useState<number | null>(0);

  async function gerar() {
    if (!titulo || descricao.length < 30) {
      setErro("Preencha o título e cole a descrição da vaga.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setPreparo(null);
    try {
      const res = await fetchWithTimeout(
        "/api/entrevista",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, descricao, idioma }),
        },
        240000,
      );
      const data = await res.json();
      if (data.success) setPreparo(data.data.preparo);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao preparar.");
    } finally {
      setCarregando(false);
    }
  }

  const fracos = preparo?.perguntas.filter((p) => p.ponto_fraco).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl border border-line-soft p-6 space-y-4">
        <input
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20"
          placeholder="Título da vaga"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20"
          rows={8}
          placeholder="Cole a descrição da vaga"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="pt-BR">Preparar em português</option>
            <option value="en-CA">Preparar em inglês (Canadá)</option>
          </select>
          <button
            onClick={gerar}
            disabled={carregando}
            className="px-5 py-2.5 rounded-full bg-accent text-on-accent text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {carregando ? "Preparando…" : "Preparar entrevista"}
          </button>
        </div>

        {erro && (
          <div className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        <Progresso
          ativo={carregando}
          etapas={[
            { apos: 0, texto: "Lendo seu perfil e suas cartas…" },
            { apos: 10, texto: "Cruzando a vaga com sua experiência…" },
            { apos: 30, texto: "Montando os roteiros de resposta…" },
          ]}
        />
      </div>

      {preparo && (
        <>
          <div className="bg-surface rounded-xl border border-line-soft p-6">
            <h2 className="text-lg font-medium text-content mb-2">
              O que esperar
            </h2>
            <p className="text-[15px] text-content-muted leading-relaxed">
              {preparo.resumo_da_conversa}
            </p>
            {fracos > 0 && (
              <p className="mt-4 text-sm rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-4 py-3 leading-relaxed">
                {fracos} pergunta{fracos > 1 ? "s" : ""} sem apoio no seu perfil —
                marcadas abaixo. São as que exigem preparo honesto, não
                improviso.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-medium text-content">
              Perguntas prováveis
            </h2>
            {preparo.perguntas.map((p, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl border border-line-soft overflow-hidden"
              >
                <button
                  onClick={() => setAberta(aberta === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-surface-2 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge tone="neutral">{CATEGORIA[p.categoria]}</Badge>
                      {p.ponto_fraco && <Badge tone="warning">sem apoio no perfil</Badge>}
                    </div>
                    <p className="text-[15px] text-content font-medium">{p.pergunta}</p>
                  </div>
                  <span className="text-content-subtle shrink-0 mt-1">
                    {aberta === i ? "−" : "+"}
                  </span>
                </button>

                {aberta === i && (
                  <div className="px-5 pb-5 space-y-3 border-t border-line-soft pt-4">
                    <div>
                      <p className="text-xs text-content-subtle mb-1">
                        Por que perguntam
                      </p>
                      <p className="text-sm text-content-muted leading-relaxed">
                        {p.porque_perguntam}
                      </p>
                    </div>

                    {p.ancora ? (
                      <div>
                        <p className="text-xs text-content-subtle mb-1">
                          Responda com
                        </p>
                        <p className="text-sm text-content leading-relaxed">
                          <Icone nome="jobfit" tamanho="0.9em" className="inline mr-1.5 opacity-60" />
                          {p.ancora}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                        Seu perfil não tem material direto para esta. Veja o
                        roteiro — a saída é reconhecer e redirecionar, não
                        improvisar.
                      </p>
                    )}

                    <div>
                      <p className="text-xs text-content-subtle mb-1">Roteiro</p>
                      <p className="text-sm text-content-muted leading-relaxed whitespace-pre-wrap">
                        {p.roteiro}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Lista titulo="Perguntas para você fazer" itens={preparo.perguntas_para_fazer} />
            <Lista titulo="O que evitar" itens={preparo.pontos_a_evitar} />
          </div>

          <Lista titulo="Antes da entrevista" itens={preparo.preparo_pratico} />
        </>
      )}
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens?.length) return null;
  return (
    <div className="bg-surface rounded-xl border border-line-soft p-6">
      <h3 className="text-[15px] font-medium text-content mb-3">{titulo}</h3>
      <ul className="space-y-2">
        {itens.map((t, i) => (
          <li key={i} className="text-sm text-content-muted leading-relaxed flex gap-2">
            <span className="text-content-subtle shrink-0">·</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
