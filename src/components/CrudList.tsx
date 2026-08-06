"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { SubmitButton } from "./form";
import { Button } from "./ui";
import { CampoComIa, type CampoIa } from "./CampoComIa";

/**
 * Lista CRUD com edição inline e reordenação — totalmente client-side.
 *
 * Recebe uma SPEC declarativa de campos (não render-props, que o RSC proíbe
 * passar de server→client). Cada item mostra um resumo + Editar/Remover; Editar
 * troca o card por um form pré-preenchido. A action de save detecta create vs
 * update pelo campo oculto `id` (padrão das actions do projeto).
 */

type ActionState = { error?: string; success?: boolean };
type SaveAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export interface CrudRow {
  id: number;
  summary: ItemSummary;
  values: Record<string, string | boolean | undefined>;
}

export type FieldSpec =
  | {
      kind: "text" | "date" | "url";
      name: string;
      label: string;
      required?: boolean;
      placeholder?: string;
      hint?: string;
      half?: boolean; // ocupa metade da grade
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      rows?: number;
      placeholder?: string;
      hint?: string;
      /** Liga o botão "Melhorar com IA" e diz que tipo de texto é este. */
      ia?: CampoIa;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      half?: boolean;
    }
  | {
      kind: "checkbox";
      name: string;
      label: string;
    };

/** Resumo do item (título/subtítulo/tags) — dados simples, serializáveis. */
export interface ItemSummary {
  title: string;
  badge?: { text: string; tone?: "primary" | "neutral" };
  subtitle?: string;
  meta?: string;
  tags?: string[];
  link?: string | null;
}

export function CrudList({
  rows,
  fields,
  emptyValues,
  saveAction,
  deleteAction,
  addLabel = "Adicionar",
  reorderAction,
}: {
  /** Linhas pré-computadas no server (summary + valores do form). Serializável. */
  rows: CrudRow[];
  /** Spec dos campos do form. */
  fields: FieldSpec[];
  /** Valores default de um item novo (form de adição). */
  emptyValues: Record<string, string | boolean | undefined>;
  saveAction: SaveAction;
  deleteAction: (fd: FormData) => void | Promise<void>;
  addLabel?: string;
  reorderAction?: (ids: number[]) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [order, setOrder] = useState(rows);
  const [, startTransition] = useTransition();

  const idsChanged =
    rows.map((i) => i.id).join(",") !== order.map((i) => i.id).join(",");
  if (idsChanged && editingId === null && !adding) setOrder(rows);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    if (reorderAction) startTransition(() => reorderAction(next.map((i) => i.id)));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding && <Button onClick={() => setAdding(true)}>{addLabel}</Button>}
      </div>

      {adding && (
        <div className="bg-surface rounded-xl border border-line p-6">
          <CrudForm
            saveAction={saveAction}
            fields={fields}
            defaults={emptyValues}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {order.length === 0 && !adding && (
        <p className="text-content-subtle text-sm">Nada cadastrado ainda.</p>
      )}

      {order.map((item, i) => {
        if (editingId === item.id) {
          return (
            <div key={item.id} className="bg-surface rounded-xl border border-primary-300 p-6">
              <CrudForm
                saveAction={saveAction}
                fields={fields}
                defaults={item.values}
                itemId={item.id}
                onDone={() => setEditingId(null)}
                contextoIa={[item.summary.title, item.summary.subtitle].filter(Boolean).join(" — ")}
              />
            </div>
          );
        }
        const s = item.summary;
        return (
          <div
            key={item.id}
            className="bg-surface rounded-xl border border-line p-5 flex justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-content flex items-center gap-2">
                {s.title}
                {s.badge && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      s.badge.tone === "primary"
                        ? "bg-primary-100 text-primary-700"
                        : "bg-surface-3 text-content-muted"
                    }`}
                  >
                    {s.badge.text}
                  </span>
                )}
              </h3>
              {s.subtitle && <p className="text-sm text-content-muted">{s.subtitle}</p>}
              {s.meta && <p className="text-xs text-content-subtle mt-1">{s.meta}</p>}
              {s.tags && s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {s.tags.map((t) => (
                    <span key={t} className="text-xs bg-surface-3 text-content-muted px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {s.link && (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-600 hover:underline mt-1 inline-block"
                >
                  ver link
                </a>
              )}
            </div>
            <div className="flex items-start gap-2 shrink-0">
              {reorderAction && (
                <span className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-content-subtle hover:text-content disabled:opacity-30 text-xs" aria-label="Subir">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="text-content-subtle hover:text-content disabled:opacity-30 text-xs" aria-label="Descer">▼</button>
                </span>
              )}
              <button onClick={() => setEditingId(item.id)} className="text-sm text-primary-600 hover:underline">
                Editar
              </button>
              <form action={deleteAction} className="inline">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="text-sm text-red-600 hover:text-red-800 hover:underline">
                  Remover
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CrudForm({
  saveAction,
  fields,
  defaults,
  itemId,
  onDone,
  contextoIa,
}: {
  saveAction: SaveAction;
  fields: FieldSpec[];
  defaults: Record<string, string | boolean | undefined>;
  itemId?: number;
  onDone: () => void;
  contextoIa?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveAction, {});
  if (state.success) onDone();

  const gridFields = fields.filter(
    (f) => f.kind === "text" || f.kind === "date" || f.kind === "url" || f.kind === "select",
  );
  const fullFields = fields.filter(
    (f) => f.kind === "textarea" || f.kind === "checkbox",
  );

  return (
    <form action={formAction} className="space-y-4">
      {itemId != null && <input type="hidden" name="id" value={itemId} />}
      {state.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-2 text-sm">{state.error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gridFields.map((f) => (
          <FieldInput key={f.name} field={f} value={defaults[f.name]} contextoIa={contextoIa} />
        ))}
      </div>
      {fullFields.map((f) => (
        <FieldInput key={f.name} field={f} value={defaults[f.name]} contextoIa={contextoIa} />
      ))}
      <div className="flex gap-2">
        <SubmitButton label={itemId != null ? "Salvar alterações" : "Adicionar"} />
        <button type="button" onClick={onDone} className="px-4 py-2 text-sm text-content-muted hover:text-content">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  contextoIa,
}: {
  field: FieldSpec;
  value: string | boolean | undefined;
  /** Cargo/empresa do item em edição — dá ao modelo o vocabulário certo. */
  contextoIa?: string;
}) {
  if (field.kind === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-content-muted">
        <input type="checkbox" name={field.name} defaultChecked={!!value} className="rounded" />
        {field.label}
      </label>
    );
  }
  if (field.kind === "textarea") {
    if (field.ia) {
      return (
        <CampoComIa
          name={field.name}
          label={field.label}
          campo={field.ia}
          contexto={contextoIa}
          rows={field.rows ?? 3}
          defaultValue={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          hint={field.hint}
        />
      );
    }
    return (
      <label className="block">
        <span className="block text-[13px] font-medium text-content mb-1.5">{field.label}</span>
        <textarea
          name={field.name}
          rows={field.rows ?? 3}
          defaultValue={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20"
        />
        {field.hint && (
          <span className="block text-xs text-content-subtle mt-1.5">{field.hint}</span>
        )}
      </label>
    );
  }
  if (field.kind === "select") {
    return (
      <label className="block">
        <span className="block text-sm font-medium text-content-muted mb-1">{field.label}</span>
        <select
          name={field.name}
          defaultValue={typeof value === "string" ? value : undefined}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-surface outline-none"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
    );
  }
  // text | date | url
  return (
    <label className="block">
      <span className="block text-sm font-medium text-content-muted mb-1">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </span>
      <input
        name={field.name}
        type={field.kind === "date" ? "date" : "text"}
        required={field.required}
        placeholder={field.placeholder}
        defaultValue={typeof value === "string" ? value : ""}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
      />
      {field.hint && <span className="block text-xs text-content-subtle mt-1">{field.hint}</span>}
    </label>
  );
}
