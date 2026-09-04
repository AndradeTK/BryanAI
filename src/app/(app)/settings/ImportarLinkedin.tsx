"use client";

import { useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

/**
 * Importa o perfil do LinkedIn como propostas.
 *
 * Não grava: cada item novo vira uma proposta na fila, com o antes → depois.
 * O que você já tem cadastrado e refinado não é tocado — e o que o arquivo
 * repete é descartado antes mesmo de virar proposta.
 *
 * O upload é o caminho manual. Pelo MCP (bryanai_profile_import) o Claude com
 * acesso ao navegador lê o perfil logado e manda o texto direto, sem arquivo —
 * mesma extração, mesma deduplicação, mesma fila.
 */
export function ImportarLinkedin() {
  const input = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File) {
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      const res = await fetchWithTimeout(
        "/api/perfil/importar-linkedin",
        { method: "POST", body: fd },
        240000,
      );
      const data = await res.json();
      if (data.success) setResultado(data.data.mensagem);
      else setErro(data.error);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setCarregando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="bg-surface rounded-xl border border-line p-6">
      <h2 className="text-lg font-semibold text-content">
        Importar do LinkedIn
      </h2>
      <p className="text-sm text-content-subtle mt-1 mb-2">
        Com o conector do BryanAI ligado, peça ao Claude para importar seu
        LinkedIn: ele abre seu perfil no navegador, lê e manda para cá. O que
        estiver faltando vira proposta para você revisar — nada é gravado
        direto, e o que você já tem não é alterado.
      </p>
      <p className="text-sm text-content-subtle mb-4">
        Sem isso, o caminho manual: no seu perfil do LinkedIn,{" "}
        <strong>More → Save to PDF</strong>, e suba o arquivo aqui.
      </p>

      <input
        ref={input}
        type="file"
        accept=".pdf,application/pdf,.docx"
        disabled={carregando}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
        }}
        className="block w-full text-sm text-content-muted file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-accent file:text-on-accent hover:file:bg-accent-hover file:cursor-pointer disabled:opacity-50"
      />

      {carregando && (
        <p className="text-sm text-content-muted mt-3">
          Lendo o arquivo e comparando com o seu perfil… pode levar até um
          minuto.
        </p>
      )}

      {resultado && (
        <p className="text-sm text-content mt-3">
          {resultado}{" "}
          <a href="/propostas" className="text-primary-600 hover:underline">
            Ver propostas
          </a>
        </p>
      )}

      {erro && (
        <p role="alert" className="text-sm text-red-600 mt-3">
          {erro}
        </p>
      )}
    </section>
  );
}
