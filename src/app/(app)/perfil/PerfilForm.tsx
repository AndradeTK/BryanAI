"use client";

import { useActionState, useState } from "react";
import { savePerfil, type ActionState } from "./actions";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Field, SubmitButton } from "@/components/form";
import type { Perfil } from "@/server/db/schema";

export function PerfilForm({ perfil }: { perfil: Perfil | null }) {
  const [state, action] = useActionState<ActionState, FormData>(savePerfil, {});
  const [resumo, setResumo] = useState(perfil?.resumoBase ?? "");
  const [iaLoading, setIaLoading] = useState(false);
  const [iaErro, setIaErro] = useState<string | null>(null);

  async function otimizarResumo() {
    setIaLoading(true);
    setIaErro(null);
    try {
      const res = await fetchWithTimeout(
        "/api/perfil/otimizar",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        60000,
      );
      const data = await res.json();
      if (data.success) setResumo(data.data.resumo);
      else setIaErro(data.error);
    } catch (e) {
      setIaErro(e instanceof Error ? e.message : "Erro ao otimizar.");
    } finally {
      setIaLoading(false);
    }
  }

  return (
    <form action={action} className="space-y-5">
      {state.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Perfil salvo com sucesso.
        </div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Nome completo"
          name="nomeCompleto"
          defaultValue={perfil?.nomeCompleto}
          required
        />
        <Field label="Email" name="email" type="email" defaultValue={perfil?.email} />
        <Field label="Telefone" name="telefone" defaultValue={perfil?.telefone} />
        <Field
          label="Localização"
          name="localizacao"
          defaultValue={perfil?.localizacao}
        />
        <Field label="LinkedIn" name="linkedin" defaultValue={perfil?.linkedin} />
        <Field label="GitHub" name="github" defaultValue={perfil?.github} />
        <Field
          label="Data de nascimento"
          name="dataNascimento"
          type="date"
          defaultValue={perfil?.dataNascimento}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-content-muted">
            Resumo profissional
          </span>
          <button
            type="button"
            onClick={otimizarResumo}
            disabled={iaLoading}
            className="text-xs px-3 py-1 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 disabled:opacity-60 dark:bg-primary-900/40 dark:text-primary-300"
          >
            {iaLoading ? "Gerando..." : "✨ Gerar/otimizar com IA"}
          </button>
        </div>
        <textarea
          name="resumoBase"
          rows={5}
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          placeholder="Um parágrafo sobre sua trajetória e objetivos — ou clique em Gerar com IA."
          className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        />
        {iaErro && <p className="text-xs text-red-600 mt-1">{iaErro}</p>}
      </div>

      <SubmitButton />
    </form>
  );
}
