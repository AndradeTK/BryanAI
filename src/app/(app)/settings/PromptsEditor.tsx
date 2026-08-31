"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/form";
import { salvarPrompt, type ActionState } from "./actions";

interface PromptSpec {
  chave: string;
  label: string;
  descricao: string;
  padrao: string;
  atual: string;
  customizado: boolean;
}

/**
 * Edição dos prompts do sistema.
 *
 * O que está aqui é o estilo. A regra que proíbe inventar métricas NÃO aparece
 * neste editor e é concatenada depois de qualquer customização — apagar o que
 * não se vê é impossível, e essa é a única forma de a proteção não depender de
 * o usuário lembrar de mantê-la.
 */
export function PromptsEditor({ prompts }: { prompts: PromptSpec[] }) {
  return (
    <section className="bg-surface rounded-xl border border-line p-6">
      <h2 className="text-lg font-semibold text-content">Prompts da IA</h2>
      <p className="text-sm text-content-subtle mt-1 mb-4">
        Reescreva como a IA trabalha. As proteções contra métrica inventada e os
        campos proibidos no currículo canadense continuam valendo — são
        garantidas pela estrutura do sistema, não por este texto.
      </p>

      <div className="space-y-4">
        {prompts.map((p) => (
          <PromptItem key={p.chave} spec={p} />
        ))}
      </div>
    </section>
  );
}

function PromptItem({ spec }: { spec: PromptSpec }) {
  const [state, action] = useActionState<ActionState, FormData>(salvarPrompt, {});
  const [texto, setTexto] = useState(spec.atual);
  const alterado = texto.trim() !== spec.atual.trim();

  return (
    <details className="border border-line rounded-lg p-4 group">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
        <span>
          <span className="text-sm font-medium text-content">{spec.label}</span>
          {spec.customizado && (
            <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
              customizado
            </span>
          )}
          <p className="text-xs text-content-subtle mt-0.5">{spec.descricao}</p>
        </span>
        <span className="text-content-subtle text-xs shrink-0">
          <span className="group-open:hidden">abrir ▸</span>
          <span className="hidden group-open:inline">fechar ▾</span>
        </span>
      </summary>

      <form action={action} className="mt-3 space-y-2">
        <input type="hidden" name="chave" value={spec.chave} />
        <textarea
          name="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={14}
          spellCheck={false}
          className="w-full rounded-lg border border-line px-3 py-2 text-xs font-mono bg-surface-2 outline-none focus:border-primary-500"
        />
        <div className="flex items-center gap-3">
          <SubmitButton label="Salvar prompt" />
          <button
            type="button"
            onClick={() => setTexto(spec.padrao)}
            className="text-sm text-content-muted hover:text-content"
          >
            Restaurar ao padrão
          </button>
          {alterado && (
            <span className="text-xs text-content-subtle">não salvo</span>
          )}
          {state.success && !alterado && (
            <span className="text-xs text-content-muted">salvo</span>
          )}
          {state.error && (
            <span role="alert" className="text-xs text-red-600">
              {state.error}
            </span>
          )}
        </div>
      </form>
    </details>
  );
}
