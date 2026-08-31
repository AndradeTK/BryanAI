"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Progresso } from "@/components/Progresso";
import { Icone } from "@/components/Icone";
import { Markdown } from "@/components/Markdown";

interface Proposta {
  ferramenta: string;
  rotulo: string;
  argumentos: Record<string, unknown>;
}

interface Bolha {
  papel: "user" | "model";
  texto: string;
  anexos?: string[];
  proposta?: Proposta | null;
  decidida?: "aplicada" | "descartada";
  resultado?: string;
}

const SUGESTOES = [
  "O que minhas cartas de recomendação dizem que ainda não está no meu perfil?",
  "O que falta no meu perfil para vagas no Canadá?",
  "Resume o que você sabe sobre mim",
];

const ROTULO_CAMPO: Record<string, string> = {
  id: "Registro", empresa: "Empresa", cargo: "Cargo", dataInicio: "Início",
  dataFim: "Fim", categoria: "Categoria", tagsTecnicas: "Tecnologias",
  descricaoAtividades: "Atividades", principaisConquistas: "Conquistas",
  nomeCompleto: "Nome", email: "E-mail", telefone: "Telefone",
  localizacao: "Localização", linkedin: "LinkedIn", github: "GitHub",
  resumoBase: "Resumo profissional", tipo: "Tipo", tituloCurso: "Título",
  instituicaoProjeto: "Instituição", status: "Status",
  descricaoDetalhada: "Descrição", link: "Link", tituloDoCurso: "Certificação",
  emissorInstituicao: "Emissor", descricao: "Descrição", destaque: "Destaque",
  idioma: "Idioma", nivelCefr: "Nível", certificacaoExame: "Exame",
  historicoDeEscolas: "Escolas", workAuthorization: "Autorização de trabalho",
  preferredProvinces: "Províncias", clbEnglish: "CLB inglês",
  nclcFrench: "NCLC francês", languageTest: "Teste de idioma",
  ecaStatus: "Status do ECA", ecaEquivalency: "Equivalência ECA",
  regulatedProfession: "Profissão regulamentada", licenseStatus: "Licença",
  canadianExpMonths: "Experiência canadense (meses)",
  canadianCity: "Cidade no Canadá", canadianPhone: "Telefone canadense",
  pergunta: "Pergunta", resposta: "Resposta",
};

function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v);
}

const ACEITA =
  "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp";

const CHAVE_STORAGE = "bryanai_conversa";

/**
 * Monta o histórico enviado ao modelo.
 *
 * Não basta o texto: quando ele propõe uma alteração e você aplica, o resultado
 * precisa entrar na conversa. Sem isso ele não sabe que a mudança aconteceu e
 * volta a oferecer a mesma coisa no turno seguinte — o que parece falta de
 * memória, mas é informação que nunca chegou até ele.
 */
function montarHistorico(bolhas: Bolha[]) {
  return bolhas.map((b) => {
    if (b.papel !== "model" || !b.proposta) {
      return { papel: b.papel, texto: b.texto };
    }
    const resumo = JSON.stringify(b.proposta.argumentos);
    const desfecho =
      b.decidida === "aplicada"
        ? `[A alteração foi APLICADA pelo usuário: ${b.proposta.rotulo} — ${resumo}]`
        : b.decidida === "descartada"
          ? `[O usuário DESCARTOU esta alteração: ${b.proposta.rotulo}. Não insista sem ele pedir.]`
          : `[Proposta feita, ainda sem decisão: ${b.proposta.rotulo}]`;
    return { papel: b.papel, texto: `${b.texto}\n${desfecho}` };
  });
}

export function ChatClient() {
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [entrada, setEntrada] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aplicando, setAplicando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  /** Evita gravar o estado vazio por cima da conversa antes de recuperá-la. */
  const [pronto, setPronto] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const areaTexto = useRef<HTMLTextAreaElement>(null);

  // Recupera a conversa ao abrir. Sem isto, recarregar a página apagava tudo —
  // e a sensação era de um assistente que esquece.
  useEffect(() => {
    let vivo = true;

    // O banco é a fonte da verdade desde que a conversa saiu do localStorage:
    // assim ela sobrevive a limpar dados do site e existe em outro aparelho.
    // O storage local vira cache de abertura, para a tela não piscar vazia.
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) setBolhas(JSON.parse(salvo));
    } catch {
      // storage indisponível ou conteúdo corrompido: começa limpo
    }

    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo || !d?.success) return;
        const msgs = d.data?.mensagens ?? [];
        // Só sobrescreve se o servidor tem algo: uma conversa recém-limpa não
        // deve ressuscitar o cache local.
        if (msgs.length > 0) setBolhas(msgs);
      })
      .catch(() => {
        // Offline ou erro: segue com o que veio do storage.
      })
      .finally(() => {
        if (vivo) setPronto(true);
      });

    return () => {
      vivo = false;
    };
  }, []);

  // Guarda a cada mudança. Anexos não entram: são arquivos, e o que importa
  // preservar é a conversa.
  useEffect(() => {
    if (!pronto) return;
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(bolhas.slice(-60)));
    } catch {
      // cota estourada: a conversa em memória segue funcionando
    }
  }, [bolhas, pronto]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bolhas, carregando]);

  // Cresce com o conteúdo até um teto, em vez de rolar dentro de uma linha.
  useEffect(() => {
    const el = areaTexto.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [entrada]);

  function adicionarArquivos(novos: FileList | File[]) {
    const lista = Array.from(novos);
    setArquivos((a) => [...a, ...lista].slice(0, 4));
    setErro(null);
  }

  async function enviar(texto: string) {
    const msg = texto.trim();
    if ((!msg && arquivos.length === 0) || carregando) return;

    const historico = montarHistorico(bolhas);
    const nomesAnexos = arquivos.map((a) => a.name);

    setBolhas((b) => [
      ...b,
      { papel: "user", texto: msg || "(anexo)", anexos: nomesAnexos },
    ]);
    setEntrada("");
    setArquivos([]);
    setErro(null);
    setCarregando(true);

    try {
      const fd = new FormData();
      fd.append("mensagem", msg);
      fd.append("historico", JSON.stringify(historico));
      for (const a of arquivos) fd.append("anexos", a);

      const res = await fetchWithTimeout("/api/chat", { method: "POST", body: fd }, 240000);
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
            i === indice ? { ...x, decidida: "aplicada", resultado: data.data.mensagem } : x,
          ),
        );
      } else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao aplicar.");
    } finally {
      setAplicando(null);
    }
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-13rem)] relative"
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        if (e.dataTransfer.files.length) adicionarArquivos(e.dataTransfer.files);
      }}
    >
      {arrastando && (
        <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-blue bg-blue-soft/60 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium text-blue">Solte para anexar</span>
        </div>
      )}

      {bolhas.length > 0 && (
        <div className="flex justify-end pb-3">
          <button
            onClick={() => {
              setBolhas([]);
              setErro(null);
              try {
                localStorage.removeItem(CHAVE_STORAGE);
              } catch {
                /* sem storage: basta limpar a memória */
              }
              // Apaga no banco também: sem isto a conversa voltaria no
              // próximo carregamento, agora que o servidor é a fonte.
              fetch("/api/chat", { method: "DELETE" }).catch(() => {});
            }}
            className="text-xs text-content-subtle hover:text-content transition px-3 py-1.5 rounded-full hover:bg-surface-3"
          >
            Nova conversa
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {bolhas.length === 0 && (
          <div className="text-center py-10">
            <p className="text-content-muted text-[15px] leading-relaxed max-w-md mx-auto">
              Converse sobre seu currículo. Eu leio seus dados e seus documentos,
              e proponho alterações — nada é salvo sem você aprovar.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-sm text-content-muted hover:text-content border border-line rounded-full px-4 py-2 transition hover:bg-surface-3 max-w-full"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {bolhas.map((b, i) => (
          <div key={i}>
            {b.papel === "user" ? (
              <div className="ml-auto w-fit max-w-[80%]">
                <div className="rounded-2xl rounded-br-md bg-accent text-on-accent px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {b.texto}
                </div>
                {b.anexos && b.anexos.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                    {b.anexos.map((n) => (
                      <span
                        key={n}
                        className="inline-flex items-center gap-1 text-[11px] text-content-subtle border border-line rounded-full px-2 py-0.5"
                      >
                        <Icone nome="anexo" tamanho="0.85em" />
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[88%] text-[15px] leading-relaxed text-content-muted">
                <Markdown texto={b.texto} />
              </div>
            )}

            {b.proposta && (
              <div className="mt-3 max-w-[88%] rounded-xl border border-line bg-surface overflow-hidden">
                <div className="px-4 py-2.5 border-b border-line-soft flex items-center gap-2">
                  <Icone nome="editar" tamanho="1em" className="text-content-subtle" />
                  <span className="text-[13px] font-medium text-content">
                    {b.proposta.rotulo}
                  </span>
                  <span className="ml-auto text-[11px] text-content-subtle">
                    nada foi salvo ainda
                  </span>
                </div>

                <dl className="px-4 py-3 space-y-2">
                  {Object.entries(b.proposta.argumentos).map(([campo, valor]) => (
                    <div key={campo} className="grid grid-cols-[8.5rem_1fr] gap-3 text-sm">
                      <dt className="text-content-subtle">{ROTULO_CAMPO[campo] ?? campo}</dt>
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
                      onClick={() =>
                        setBolhas((bb) =>
                          bb.map((x, j) => (j === i ? { ...x, decidida: "descartada" } : x)),
                        )
                      }
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
            { apos: 6, texto: "Consultando seus dados e documentos…" },
            { apos: 25, texto: "Ainda trabalhando — arquivo grande leva mais tempo." },
          ]}
        />

        {erro && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        <div ref={fimRef} />
      </div>

      {arquivos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {arquivos.map((a, i) => (
            <span
              key={`${a.name}-${i}`}
              className="inline-flex items-center gap-2 text-xs text-content border border-line rounded-full pl-3 pr-1.5 py-1.5 bg-surface"
            >
              <Icone nome="anexo" tamanho="0.9em" className="text-content-subtle" />
              <span className="max-w-[14rem] truncate">{a.name}</span>
              <span className="text-content-subtle">
                {(a.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button
                onClick={() => setArquivos((x) => x.filter((_, j) => j !== i))}
                className="w-5 h-5 rounded-full hover:bg-surface-3 flex items-center justify-center text-content-subtle"
                aria-label={`Remover ${a.name}`}
              >
                <Icone nome="fechar" tamanho="0.85em" />
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(entrada);
        }}
        className="mt-3 flex gap-2 items-end"
      >
        <input
          ref={inputArquivo}
          type="file"
          accept={ACEITA}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputArquivo.current?.click()}
          className="shrink-0 h-11 w-11 rounded-full border border-line text-content-muted hover:bg-surface-3 hover:text-content flex items-center justify-center transition"
          aria-label="Anexar arquivo"
          title="Anexar PDF, DOCX ou imagem"
        >
          <Icone nome="anexo" tamanho="1.1em" />
        </button>

        <textarea
          ref={areaTexto}
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(entrada);
            }
          }}
          rows={1}
          placeholder="Conte uma experiência, anexe uma carta, pergunte o que falta…"
          className="flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-content placeholder:text-content-subtle outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20"
        />

        <button
          type="submit"
          disabled={carregando || (!entrada.trim() && arquivos.length === 0)}
          className="shrink-0 h-11 w-11 rounded-full bg-accent text-on-accent flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 transition"
          aria-label="Enviar"
        >
          <Icone nome="enviar" tamanho="1.15em" />
        </button>
      </form>

      <p className="mt-2 text-[11px] text-content-subtle text-center">
        Enter envia · Shift+Enter quebra linha · arraste arquivos para anexar
      </p>
    </div>
  );
}
