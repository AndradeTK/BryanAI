"use client";

import { Icone } from "./Icone";

export interface PropostaExibivel {
  ferramenta: string;
  rotulo: string;
  argumentos: Record<string, unknown>;
}

/** Rótulos amigáveis dos campos. Mostrar `descricaoAtividades` cru é ruim. */
export const ROTULO_CAMPO: Record<string, string> = {
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
  papel: "Papel", periodoInicio: "Início", periodoFim: "Fim",
  noCanada: "Feito no Canadá",
  pergunta: "Pergunta", resposta: "Resposta",
};

export function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v);
}

/**
 * O card de uma alteração proposta pela IA, antes de virar dado.
 *
 * Vive fora do chat porque é usado em dois contextos com necessidades
 * diferentes: no assistente, onde você acabou de conversar sobre aquilo; e na
 * fila de `/propostas`, onde você chega horas depois vindo de outro app.
 *
 * Daí o `atual`: no chat o contexto está fresco, mas na fila
 * `Empresa: Acme Corp` sozinho não diz nada — `Acme → Acme Corp` é o que
 * decide a aprovação.
 */
export function CardProposta({
  proposta,
  atual,
  origem,
  quando,
  decidida,
  resultado,
  aplicando,
  onAplicar,
  onDescartar,
}: {
  proposta: PropostaExibivel;
  /** Valores hoje no banco, quando a operação altera um registro existente. */
  atual?: Record<string, unknown> | null;
  /** De onde veio, quando não foi o assistente interno ("Claude.ai"). */
  origem?: string | null;
  quando?: string;
  decidida?: "aplicada" | "descartada";
  resultado?: string;
  aplicando?: boolean;
  onAplicar?: () => void;
  onDescartar?: () => void;
}) {
  const campos = Object.entries(proposta.argumentos);

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line-soft flex items-center gap-2 flex-wrap">
        <Icone nome="editar" tamanho="1em" className="text-content-subtle" />
        <span className="text-[13px] font-medium text-content">
          {proposta.rotulo}
        </span>
        {origem && (
          <span className="text-[11px] bg-surface-3 text-content-muted px-2 py-0.5 rounded-full">
            {origem}
          </span>
        )}
        <span className="ml-auto text-[11px] text-content-subtle">
          {quando ?? "nada foi salvo ainda"}
        </span>
      </div>

      <dl className="px-4 py-3 space-y-2">
        {campos.map(([campo, valor]) => {
          const anterior = atual?.[campo];
          // Só mostra o "antes" quando existe e é diferente — repetir o mesmo
          // valor dos dois lados só polui a leitura.
          const mudou =
            atual != null &&
            campo !== "id" &&
            anterior !== undefined &&
            formatarValor(anterior) !== formatarValor(valor);

          return (
            <div key={campo} className="grid grid-cols-[8.5rem_1fr] gap-3 text-sm">
              <dt className="text-content-subtle">
                {ROTULO_CAMPO[campo] ?? campo}
              </dt>
              <dd className="text-content break-words whitespace-pre-wrap">
                {mudou && (
                  <span className="text-content-subtle line-through mr-2">
                    {formatarValor(anterior)}
                  </span>
                )}
                {formatarValor(valor)}
              </dd>
            </div>
          );
        })}
      </dl>

      {decidida ? (
        <div
          className={`px-4 py-2.5 border-t border-line-soft text-[13px] ${
            decidida === "aplicada"
              ? "text-green-700 dark:text-green-300"
              : "text-content-subtle"
          }`}
        >
          {decidida === "aplicada"
            ? (resultado ?? "Aplicado.")
            : "Descartado — nada foi salvo."}
        </div>
      ) : (
        (onAplicar || onDescartar) && (
          <div className="px-4 py-3 border-t border-line-soft flex gap-2">
            {onAplicar && (
              <button
                onClick={onAplicar}
                disabled={aplicando}
                className="px-4 py-2 rounded-full bg-accent text-on-accent text-[13px] font-medium hover:bg-accent-hover disabled:opacity-50"
              >
                {aplicando ? "Aplicando…" : "Aplicar"}
              </button>
            )}
            {onDescartar && (
              <button
                onClick={onDescartar}
                disabled={aplicando}
                className="px-4 py-2 rounded-full border border-line text-content text-[13px] hover:bg-surface-3 disabled:opacity-50"
              >
                Descartar
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
