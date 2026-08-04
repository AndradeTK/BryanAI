"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { Button } from "@/components/ui";

/** Export/import do backup JSON (#19). */
export function DadosBackup() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function importar(file: File) {
    setLoading(true);
    setMsg(null);
    try {
      const texto = await file.text();
      const res = await fetchWithTimeout(
        "/api/dados/import",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: texto },
        60000,
      );
      const data = await res.json();
      if (data.success) {
        setMsg(`${data.data.importados} registro(s) importado(s).`);
        router.refresh();
      } else setMsg(data.error);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="/api/dados/export" download>
        <Button variant="outline">Exportar dados (JSON)</Button>
      </a>
      <label className="inline-flex">
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importar(f);
          }}
        />
        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-line text-content hover:bg-surface-3 cursor-pointer">
          {loading ? "Importando..." : "Importar backup"}
        </span>
      </label>
      {msg && <span className="text-sm text-content-muted">{msg}</span>}
    </div>
  );
}
