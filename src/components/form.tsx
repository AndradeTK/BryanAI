"use client";

import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-content mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle transition outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
      />
      {hint && <span className="block text-xs text-content-subtle mt-1.5 leading-relaxed">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-content mb-1.5">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle transition outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-content mb-1.5">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-subtle transition outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="block text-xs text-content-subtle mt-1.5 leading-relaxed">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ label = "Salvar" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-accent text-on-accent rounded-full text-sm font-medium hover:bg-accent-hover disabled:opacity-60 transition"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}
