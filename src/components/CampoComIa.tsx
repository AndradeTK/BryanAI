"use client";

import { useRef, useState } from "react";
import { Icone } from "./Icone";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export type CampoIa = "atividades" | "conquistas" | "resumo" | "descricao";

/**
 * Textarea com assistência de IA para reescrever o conteúdo.
 *
 * O resultado NÃO substitui o texto direto: aparece ao lado do original, e você
 * decide. É a mesma postura do assistente — o modelo propõe, quem aplica é
 * você. Aqui pesa ainda mais porque o texto vai para um currículo: aceitar sem
 * ler é como assinar embaixo de algo que outra pessoa escreveu.
 */
export function CampoComIa({
  name,
  label,
  campo,
  contexto,
  rows = 4,
  defaultValue = "",
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  campo: CampoIa;
  contexto?: string;
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [carregando, setCarregando] = useState(false);
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function melhorar() {
    const texto = ref.current?.value.trim() ?? "";
    if (texto.length < 10) {
      setErro("Escreva um pouco mais antes de pedir ajuda — pelo menos uma frase.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setSugestao(null);
    try {
      const res = await fetchWithTimeout(
        "/api/texto/melhorar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campo, texto, contexto }),
        },
        90000,
      );
      const data = await res.json();
      if (data.success) setSugestao(data.data.texto);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao chamar a IA.");
    } finally {
      setCarregando(false);
    }
  }

  function aceitar() {
    if (ref.current && sugestao) {
      ref.current.value = sugestao;
      // Sem isto o React não percebe a mudança feita direto no DOM.
      ref.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setSugestao(null);
  }

  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[13px] font-medium text-content">{label}</span>
        <button
          type="button"
          onClick={melhorar}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 text-[11px] text-content-subtle hover:text-content border border-line rounded-full px-2.5 py-1 transition hover:bg-surface-3 disabled:opacity-50"
          title="Reescreve o que você escreveu. Não inventa informação."
        >
          <Icone nome="jobfit" tamanho="0.95em" />
          {carregando ? "Reescrevendo…" : "Melhorar com IA"}
        </button>
      </div>

      <textarea
        ref={ref}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20"
      />
      {hint && (
        <span className="block text-xs text-content-subtle mt-1.5 leading-relaxed">
          {hint}
        </span>
      )}

      {erro && (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{erro}</p>
      )}

      {sugestao && (
        <div className="mt-2 rounded-xl border border-line bg-surface-2 overflow-hidden">
          <div className="px-3.5 py-2 border-b border-line-soft flex items-center gap-2">
            <span className="text-[12px] font-medium text-content">Sugestão</span>
            <span className="text-[11px] text-content-subtle">
              confira antes de aceitar
            </span>
          </div>
          <pre className="px-3.5 py-3 text-sm text-content whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-auto">
            {sugestao}
          </pre>
          <div className="px-3.5 py-2.5 border-t border-line-soft flex gap-2">
            <button
              type="button"
              onClick={aceitar}
              className="px-3.5 py-1.5 rounded-full bg-accent text-on-accent text-[12px] font-medium hover:bg-accent-hover"
            >
              Usar esta versão
            </button>
            <button
              type="button"
              onClick={() => setSugestao(null)}
              className="px-3.5 py-1.5 rounded-full border border-line text-content text-[12px] hover:bg-surface-3"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
