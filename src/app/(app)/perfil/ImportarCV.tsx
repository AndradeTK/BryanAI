"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

/** Auto-preencher o perfil a partir de um CV existente (#11). */
export function ImportarCV() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function importar(file: File) {
    setLoading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await fetchWithTimeout("/api/perfil/importar-cv", { method: "POST", body: fd }, 90000);
      const data = await res.json();
      if (data.success) {
        setMsg(`Perfil preenchido: ${data.data.criados} item(ns) importado(s). Revise abaixo.`);
        router.refresh();
      } else setMsg(data.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-line p-4 mb-6 flex flex-wrap items-center gap-3">
      <span className="text-sm text-content-muted">Tem um CV pronto?</span>
      <label className="inline-flex">
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importar(f);
          }}
        />
        <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 cursor-pointer dark:bg-primary-900/40 dark:text-primary-300">
          {loading ? "Extraindo com IA..." : "✨ Preencher a partir de um CV"}
        </span>
      </label>
      {msg && <span className="text-sm text-content-muted">{msg}</span>}
    </div>
  );
}
