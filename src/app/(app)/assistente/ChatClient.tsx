"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Progresso } from "@/components/Progresso";
import { Icone } from "@/components/Icone";

interface Proposta {
  ferramenta: string;
  rotulo: string;
  argumentos: Record<string, unknown>;
}

interface Bolha {
  papel: "user" | "model";
  texto: string;
  proposta?: Proposta | null;
  /** Depois de decidida, a proposta vira histórico e não aceita mais clique. */
  decidida?: "aplicada" | "descartada";
  resultado?: string;
}

const SUGESTOES = [
  "Trabalhei como atendente na Santo Beer. Me ajuda a cadastrar?",
  "O que está faltando no meu perfil para vagas no Canadá?",
  "Resume o que você sabe sobre mim",
];

/** Nomes de campo em português, para o cartão de confirmação. */
const ROTULO_CAMPO: Record<string, string> = {
  id: "Registro",
  empresa: "Empresa",
  cargo: "Cargo",
  dataInicio: "Início",
  dataFim: "Fim",
  categoria: "Categoria",
  tagsTecnicas: "Tecnologias",
  descricaoAtividades: "Atividades",
  principaisConquistas: "Conquistas",
  nomeCompleto: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  localizacao: "Localização",
  linkedin: "LinkedIn",
  github: "GitHub",
  resumoBase: "Resumo profissional",
  tipo: "Tipo",
  tituloCurso: "Título",
  instituicaoProjeto: "Instituição",
  status: "Status",
  descricaoDetalhada: "Descrição",
  link: "Link",
  tituloDoCurso: "Certificação",
  emissorInstituicao: "Emissor",
  descricao: "Descrição",
  destaque: "Destaque",
  idioma: "Idioma",
  nivelCefr: "Nível",
  certificacaoExame: "Exame",
  historicoDeEscolas: "Escolas",
  workAuthorization: "Autorização de trabalho",
  preferredProvinces: "Províncias preferidas",
  clbEnglish: "CLB inglês",
  nclcFrench: "NCLC francês",
  languageTest: "Teste de idioma",
  ecaStatus: "Status do ECA",
  ecaEquivalency: "Equivalência ECA",
  regulatedProfession: "Profissão regulamentada",
  licenseStatus: "Licença",
  canadianExpMonths: "Experiência canadense (meses)",
  canadianCity: "Cidade no Canadá",
  canadianPhone: "Telefone canadense",
  pergunta: "Pergunta",
  resposta: "Resposta",
};

function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v);
}

export function ChatClient() {
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [entrada, setEntrada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [aplicando, setAplicando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bolhas, carregando]);

  async function enviar(texto: string) {
    const msg = texto.trim();
    if (!msg || carregando) return;

    const historico = bolhas.map((b) => ({ papel: b.papel, texto: b.texto }));
    setBolhas((b) => [...b, { papel: "user", texto: msg }]);
    setEntrada("");
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetchWithTimeout(
        "/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem: msg, historico }),
        },
        180000,
      );
      const data = await res.json();
      if (data.success) {
        setBolhas((b) => [
          ...b,
          { papel: "model", texto: data.data.texto, proposta: data.data.proposta },
        ]);
      } else {
        setErro(data.error);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao conversar.");
    } finally {
      setCarregando(false);
    }
  }

  async function aplicar(indice: number, proposta: Proposta) {
    setAplicando(indice);
    setErro(null);
    try {
      const res = await fetchWithTimeout(
        "/api/chat/aplicar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proposta),
        },
        30000,
      );
      const data = await res.json();
      if (data.success) {
        setBolhas((b) =>
          b.map((x, i) =>
            i === indice
              ? { ...x, decidida: "aplicada", resultado: data.data.mensagem }
              : x,
          ),
        );
      } else {
        setErro(data.error);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao aplicar.");
    } finally {
      setAplicando(null);
    }
  }

  function descartar(indice: number) {
    setBolhas((b) =>
      b.map((x, i) => (i === indice ? { ...x, decidida: "descartada" } : x)),
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {bolhas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-content-muted text-[15px] leading-relaxed max-w-md mx-auto">
              Converse sobre seu currículo. Eu leio seus dados e proponho
              alterações — nada é salvo sem você aprovar.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-sm text-content-muted hover:text-content border border-line rounded-full px-4 py-2 transition hover:bg-surface-3"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {bolhas.map((b, i) => (
          <div key={i}>
            <div
              className={
                b.papel === "user"
                  ? "ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-accent text-on-accent px-4 py-2.5 text-sm w-fit"
                  : "max-w-[85%] text-[15px] leading-relaxed text-content whitespace-pre-wrap"
              }
            >
              {b.texto}
            </div>

            {b.proposta && (
              <div className="mt-3 max-w-[85%] rounded-xl border border-line bg-surface overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line-soft flex items-center gap-2">
                  <Icone nome="editar" tamanho="1em" className="text-content-subtle" />
                  <span className="text-[13px] font-medium text-content">
                    {b.proposta.rotulo}
                  </span>
                </div>

                <dl className="px-4 py-3 space-y-2">
                  {Object.entries(b.proposta.argumentos).map(([campo, valor]) => (
                    <div key={campo} className="grid grid-cols-[9rem_1fr] gap-3 text-sm">
                      <dt className="text-content-subtle">
                        {ROTULO_CAMPO[campo] ?? campo}
                      </dt>
                      <dd className="text-content break-words whitespace-pre-wrap">
                        {formatarValor(valor)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {b.decidida ? (
                  <div
                    className={`px-4 py-2.5 border-t border-line-soft text-[13px] ${
                      b.decidida === "aplicada"
                        ? "text-green-700 dark:text-green-300"
                        : "text-content-subtle"
                    }`}
                  >
                    {b.decidida === "aplicada"
                      ? (b.resultado ?? "Aplicado.")
                      : "Descartado — nada foi salvo."}
                  </div>
                ) : (
                  <div className="px-4 py-3 border-t border-line-soft flex gap-2">
                    <button
                      onClick={() => aplicar(i, b.proposta!)}
                      disabled={aplicando !== null}
                      className="px-4 py-2 rounded-full bg-accent text-on-accent text-[13px] font-medium hover:bg-accent-hover disabled:opacity-50"
                    >
                      {aplicando === i ? "Aplicando…" : "Aplicar"}
                    </button>
                    <button
                      onClick={() => descartar(i)}
                      disabled={aplicando !== null}
                      className="px-4 py-2 rounded-full border border-line text-content text-[13px] hover:bg-surface-3 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <Progresso
          ativo={carregando}
          etapas={[
            { apos: 0, texto: "Pensando…" },
            { apos: 6, texto: "Consultando seus dados…" },
            { apos: 20, texto: "Ainda trabalhando nisso." },
          ]}
        />

        {erro && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        <div ref={fimRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(entrada);
        }}
        className="mt-4 flex gap-2 items-end"
      >
        <textarea
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter quebra linha.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(entrada);
            }
          }}
          rows={1}
          placeholder="Conte uma experiência, peça uma correção, pergunte o que falta…"
          className="flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-content-subtle outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20 max-h-40"
        />
        <button
          type="submit"
          disabled={carregando || !entrada.trim()}
          className="shrink-0 h-11 w-11 rounded-full bg-accent text-on-accent flex items-center justify-center hover:bg-accent-hover disabled:opacity-40"
          aria-label="Enviar"
        >
          <Icone nome="carta" tamanho="1.1em" />
        </button>
      </form>
    </div>
  );
}
