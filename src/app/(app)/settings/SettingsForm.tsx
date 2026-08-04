"use client";

import { useActionState } from "react";
import { saveSettings, type ActionState } from "./actions";
import { Field, Select, SubmitButton } from "@/components/form";
import type { Settings } from "@/server/db/schema";

const TEMPLATE_OPTS = [
  { value: "minimalista", label: "Minimalista" },
  { value: "executivo", label: "Executivo" },
  { value: "tech", label: "Tech" },
  { value: "harvard", label: "Harvard" },
  { value: "classico", label: "Clássico" },
];

const IDIOMA_OPTS = [
  { value: "pt-BR", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "en-CA", label: "Inglês (Canadá)" },
  { value: "fr", label: "Francês" },
  { value: "fr-CA", label: "Francês (Canadá)" },
];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettings, {});
  const p = settings.preferencias;

  return (
    <form action={action} className="space-y-6">
      {state.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Configurações salvas.
        </div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          label="Template padrão"
          name="templatePadrao"
          options={TEMPLATE_OPTS}
          defaultValue={settings.templatePadrao}
        />
        <Select
          label="Idioma padrão"
          name="idiomaDefault"
          options={IDIOMA_OPTS}
          defaultValue={settings.idiomaDefault}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-content">Preferências</h3>
        <Toggle name="darkMode" label="Modo escuro" defaultChecked={settings.darkMode} />
        <Toggle
          name="incluirProjetos"
          label="Incluir projetos no currículo"
          defaultChecked={p.incluirProjetos}
        />
        <Toggle
          name="mostrarPortfolio"
          label="Mostrar portfólio"
          defaultChecked={p.mostrarPortfolio}
        />
        <Toggle
          name="mostrarGithub"
          label="Mostrar GitHub"
          defaultChecked={p.mostrarGithub}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Limite de certificações"
          name="limiteCertificacoes"
          type="number"
          defaultValue={String(p.limiteCertificacoes)}
        />
        <Field
          label="Formato de data (experiências)"
          name="formatoDataExperiencia"
          defaultValue={p.formatoDataExperiencia}
        />
      </div>

      <SubmitButton />
    </form>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-content-muted">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}
