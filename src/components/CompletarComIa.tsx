"use client";

import { useRef, useState } from "react";
import { Icone } from "./Icone";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export type TipoItem = "experiencia" | "formacao" | "projeto" | "atividade";

interface Pergunta {
  pergunta: string;
  area: string;
}

/**
 * Botão que gera um formulário de perguntas sobre o item, a partir do que já
 * está escrito nele.
 *
 * O sistema hoje é passivo: um formulário em branco esperando você lembrar. Se
 * você cadastra "limpar mesas, servir comida", o fechamento de caixa e o
 * treinamento dos novatos ficam perdidos — não porque não aconteceram, mas
 * porque ninguém perguntou.
 *
 * O que volta são PERGUNTAS, nunca respostas prontas para aceitar. Sugerir
 * "você provavelmente também fazia controle de estoque" produziria um
 * currículo de coisas plausíveis em vez de verdadeiras — o mesmo erro de
 * inventar uma métrica, trocando o número pela competência.
 *
 * As respostas são anexadas ao campo de texto como material bruto, na sua
 * palavra. Quem transforma em bullet é a geração do currículo, depois, com a
 * proteção de métrica que já existe.
 */
export function CompletarComIa({
  tipo,
  /** Rótulos por nome de campo: { empresa: "Empresa", cargo: "Cargo" }. */
  rotulos,
  /** Onde anexar as respostas — normalmente o textarea de descrição. */
  campoDestino,
}: {
  tipo: TipoItem;
  rotulos: Record<string, string>;
  campoDestino: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [carregando, setCarregando] = useState(false);
  const [perguntas, setPerguntas] = useState<Pergunta[] | null>(null);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [anexado, setAnexado] = useState(false);

  /**
   * Lê o que está preenchido AGORA no formulário.
   *
   * O CrudForm é não-controlado (usa defaultValue), então não há estado React
   * com os valores atuais — e é justamente o que o usuário acabou de digitar
   * que precisa alimentar as perguntas.
   */
  function camposAtuais(): Record<string, string> {
    const form = raiz.current?.closest("form");
    if (!form) return {};
    const dados = new FormData(form);
    const out: Record<string, string> = {};
    for (const [nome, rotulo] of Object.entries(rotulos)) {
      const v = dados.get(nome);
      if (typeof v === "string" && v.trim()) out[rotulo] = v.trim();
    }
    return out;
  }

  async function gerar() {
    const campos = camposAtuais();
    if (Object.keys(campos).length === 0) {
      setErro("Preencha algum campo antes de gerar as perguntas.");
      return;
    }
    setCarregando(true);
    setErro(null);
    setAnexado(false);
    try {
      const res = await fetchWithTimeout(
        "/api/item/perguntas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            campos,
            // Não repete o que já foi perguntado nesta sessão.
            jaPerguntado: perguntas?.map((p) => p.pergunta),
          }),
        },
        90000,
      );
      const data = await res.json();
      if (data.success) {
        setPerguntas(data.data.perguntas);
        setRespostas({});
      } else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao chamar a IA.");
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Anexa as respostas ao campo de destino, na palavra do usuário.
   *
   * Não reescreve nem resume: o texto cru fica auditável, e é ele que alimenta
   * a geração depois. Se um bullet aparecer com um número, dá para apontar a
   * frase que o originou.
   */
  function anexar() {
    const preenchidas = Object.entries(respostas)
      .filter(([, v]) => v.trim())
      .map(([i, v]) => `${perguntas![Number(i)].pergunta}\n${v.trim()}`);

    if (preenchidas.length === 0) {
      setErro("Responda ao menos uma pergunta antes de anexar.");
      return;
    }

    // Busca dentro do formulário, não no documento: com dois itens em edição
    // ao mesmo tempo, um querySelector global anexaria no card errado.
    const destino = raiz.current
      ?.closest("form")
      ?.querySelector<HTMLTextAreaElement>(`[name="${campoDestino}"]`);
    if (!destino) {
      setErro("Não encontrei o campo de destino nesta tela.");
      return;
    }

    const atual = destino.value.trim();
    destino.value = [atual, ...preenchidas].filter(Boolean).join("\n\n");
    // Sem isto o React não percebe a mudança feita direto no DOM.
    destino.dispatchEvent(new Event("input", { bubbles: true }));

    setPerguntas(null);
    setRespostas({});
    setErro(null);
    setAnexado(true);
  }

  return (
    <div ref={raiz} className="border border-line rounded-lg p-3 bg-surface-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-content">
            Completar com IA
          </p>
          <p className="text-xs text-content-subtle">
            Gera perguntas sobre o que você escreveu, para não esquecer nada.
          </p>
        </div>
        <button
          type="button"
          onClick={gerar}
          disabled={carregando}
          title="Gera perguntas a partir do que você já preencheu"
          className="inline-flex items-center gap-1.5 text-[11px] text-content-subtle hover:text-content border border-line rounded-full px-2.5 py-1 transition hover:bg-surface-3 disabled:opacity-50 shrink-0"
        >
          <Icone nome="assistente" tamanho="0.95em" />
          {carregando
            ? "Pensando…"
            : perguntas
              ? "Outras perguntas"
              : "Gerar perguntas"}
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-red-600 mt-2">
          {erro}
        </p>
      )}

      {anexado && (
        <p className="text-xs text-content-muted mt-2">
          Respostas anexadas ao campo de descrição. Revise antes de salvar.
        </p>
      )}

      {perguntas && (
        <div className="mt-3 space-y-3">
          {perguntas.map((p, i) => (
            <div key={i}>
              <label
                htmlFor={`pergunta-${i}`}
                className="block text-xs text-content mb-1"
              >
                {p.pergunta}
                <span className="text-content-subtle"> · {p.area}</span>
              </label>
              <textarea
                id={`pergunta-${i}`}
                rows={2}
                value={respostas[i] ?? ""}
                onChange={(e) =>
                  setRespostas((r) => ({ ...r, [i]: e.target.value }))
                }
                placeholder="Se não se aplica, deixe em branco"
                className="w-full rounded-lg border border-line px-2 py-1.5 text-xs bg-surface outline-none focus:border-primary-500"
              />
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={anexar}
              className="text-xs px-3 py-1.5 rounded-full bg-accent text-on-accent hover:bg-accent-hover transition"
            >
              Anexar respostas
            </button>
            <button
              type="button"
              onClick={() => {
                setPerguntas(null);
                setRespostas({});
                setErro(null);
              }}
              className="text-xs text-content-subtle hover:text-content"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
