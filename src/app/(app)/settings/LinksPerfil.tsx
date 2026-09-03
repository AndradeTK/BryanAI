"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form";
import {
  criarTokenPublico,
  revogarTokenPublico,
  type TokenState,
} from "./actions";

interface TokenRow {
  id: number;
  label: string | null;
  redactContact: boolean;
  podePropor: boolean;
  expiraEm: string | null;
  ultimoUso: string | null;
  usos: number;
}

/**
 * Links de leitura do perfil, para colar numa IA de terceiro.
 *
 * O token em claro aparece UMA vez, no retorno da action. O banco guarda só o
 * hash — mesmo padrão das sessões — então nem o painel consegue mostrá-lo de
 * novo depois.
 */
export function LinksPerfil({
  tokens,
  appUrl,
}: {
  tokens: TokenRow[];
  appUrl: string;
}) {
  const [state, action] = useActionState<TokenState, FormData>(
    criarTokenPublico,
    {},
  );

  const url = state.token
    ? `${appUrl}/api/public/perfil?token=${state.token}`
    : null;

  return (
    <section className="bg-surface rounded-xl border border-line p-6">
      <h2 className="text-lg font-semibold text-content">Links do perfil</h2>
      <p className="text-sm text-content-subtle mt-1 mb-4">
        Gera um link com o seu perfil em Markdown, para colar numa IA e pedir
        análise. Sem contato por padrão — um link pode vazar.
      </p>

      {url && (
        <div className="mb-4 rounded-lg border border-primary-300 bg-primary-50 dark:bg-primary-950/30 p-3">
          <p className="text-xs text-content-muted mb-1">
            Copie agora: este link não é exibido de novo.
          </p>
          <code className="block text-xs break-all text-content select-all">
            {url}
          </code>
        </div>
      )}

      <form action={action} className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex-1 min-w-40">
          <label htmlFor="label" className="block text-xs text-content-muted mb-1">
            Para quê é este link
          </label>
          <input
            id="label"
            name="label"
            maxLength={100}
            placeholder="Análise no ChatGPT"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-surface"
          />
        </div>
        <div>
          <label htmlFor="expiraEmDias" className="block text-xs text-content-muted mb-1">
            Expira em (dias)
          </label>
          <input
            id="expiraEmDias"
            name="expiraEmDias"
            type="number"
            min={1}
            max={365}
            defaultValue={90}
            className="w-28 rounded-lg border border-line px-3 py-2 text-sm bg-surface"
          />
        </div>
        <SubmitButton label="Gerar link" />

        {/* As duas permissões ficam abaixo, com o que cada uma significa
            escrito por extenso. Antes eram checkboxes neutros ao lado do
            botão — fácil demais marcar "incluir contato" sem pesar que isso
            publica telefone e e-mail num link que vai para dentro de um chat
            de terceiro. */}
        <div className="w-full space-y-2 pt-1">
          <label className="flex items-start gap-2 text-sm text-content-muted">
            <input type="checkbox" name="podePropor" className="rounded mt-0.5" />
            <span>
              Pode propor alterações (conector MCP)
              <span className="block text-xs text-content-subtle">
                Necessário para conectar no Claude. Propor não é gravar — toda
                alteração continua esperando sua aprovação em Propostas.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-content-muted">
            <input type="checkbox" name="incluirContato" className="rounded mt-0.5" />
            <span>
              Incluir e-mail e telefone
              <span className="block text-xs text-content-subtle">
                Publica seu contato no documento. Um chat de IA guarda o que
                você cola nele — deixe desmarcado a menos que precise mesmo.
              </span>
            </span>
          </label>
        </div>
      </form>

      {tokens.length === 0 ? (
        <p className="text-sm text-content-subtle">Nenhum link ativo.</p>
      ) : (
        <ul className="divide-y divide-line">
          {tokens.map((t) => (
            <li key={t.id} className="py-2 flex items-center gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="text-content">{t.label || "sem descrição"}</span>
                {t.podePropor && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                    pode propor
                  </span>
                )}
                <span className="text-content-subtle">
                  {" · "}
                  {t.redactContact ? "sem contato" : "com contato"}
                  {t.expiraEm ? ` · expira ${t.expiraEm}` : " · não expira"}
                </span>
                <p className="text-xs text-content-subtle">
                  {t.usos === 0
                    ? "nunca usado"
                    : `${t.usos} uso${t.usos > 1 ? "s" : ""}${t.ultimoUso ? ` · último em ${t.ultimoUso}` : ""}`}
                </p>
              </div>
              <form action={revogarTokenPublico}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:underline"
                >
                  Revogar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
