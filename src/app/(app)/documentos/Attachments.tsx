"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/form";
import {
  uploadDocument,
  linkDocumentToJob,
  toggleDocumentAi,
  deleteDocument,
  type ActionState,
} from "./actions";

export interface AttachmentRow {
  id: number;
  kind: "reference_letter" | "other";
  title: string;
  filename: string;
  hasText: boolean;
  useForAi: boolean;
  jobId: number | null;
  data: string;
}

export interface JobOption {
  id: number;
  label: string;
}

const KIND_LABEL: Record<AttachmentRow["kind"], string> = {
  reference_letter: "Reference letter",
  other: "Outro",
};

export function Attachments({
  rows,
  jobs,
}: {
  rows: AttachmentRow[];
  jobs: JobOption[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    uploadDocument,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-content mb-1">Meus anexos</h2>
      <p className="text-content-subtle text-sm mb-4">
        Reference letters e outros PDFs seus. O texto é lido para a IA aproveitar
        suas conquistas ao gerar CV e cover letter. Baixe aqui quando um
        formulário pedir o anexo — o navegador não deixa o Copiloto subir o
        arquivo sozinho, o upload final é sempre seu.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="bg-surface border border-line rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {state.error && (
          <div className="md:col-span-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {state.error}
          </div>
        )}
        {/* Salvou, mas com ressalva — tipicamente PDF escaneado, de que a IA
            não consegue extrair texto. Precisa ser visível: caso contrário o
            documento parece pronto para uso e não está. */}
        {state.aviso && (
          <div className="md:col-span-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-4 py-3 text-sm leading-relaxed">
            {state.aviso}
          </div>
        )}
        <label className="block">
          <span className="block text-sm font-medium text-content-muted mb-1">
            Título <span className="text-red-500">*</span>
          </span>
          <input
            name="title"
            required
            placeholder="Reference — João Silva (ex-gestor)"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-content-muted mb-1">Tipo</span>
          <select
            name="kind"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-surface outline-none"
          >
            <option value="reference_letter">Reference letter</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-content-muted mb-1">
            Vincular a uma vaga (opcional)
          </span>
          <select
            name="jobId"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-surface outline-none"
          >
            <option value="">— nenhuma —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-content-muted mb-1">
            Arquivo <span className="text-red-500">*</span>
          </span>
          <input
            name="arquivo"
            type="file"
            accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
            required
            className="w-full text-sm text-content-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-on-accent file:text-sm"
          />
          <span className="block text-xs text-content-subtle mt-1.5">
            PDF ou DOCX, até 12 MB. Prefira DOCX quando tiver: PDF escaneado é
            imagem, e a IA não consegue ler o conteúdo.
          </span>
        </label>
        <div className="md:col-span-2">
          <SubmitButton label="Enviar documento" />
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-content-subtle text-sm">Nenhum anexo ainda.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => (
            <div
              key={d.id}
              className="bg-surface border border-line rounded-xl p-4 flex flex-wrap items-center gap-x-4 gap-y-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-content">{d.title}</span>
                  <span className="text-xs bg-surface-3 text-content-muted px-2 py-0.5 rounded">
                    {KIND_LABEL[d.kind]}
                  </span>
                  {!d.hasText && (
                    <span
                      className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded"
                      title="Não foi possível extrair texto (PDF digitalizado?). O arquivo está salvo, mas a IA não o lê."
                    >
                      sem texto
                    </span>
                  )}
                </div>
                <p className="text-xs text-content-subtle mt-1">{d.data}</p>
              </div>

              {/* Vincular a vaga */}
              <form action={linkDocumentToJob} className="flex items-center gap-1">
                <input type="hidden" name="id" value={d.id} />
                <select
                  name="jobId"
                  defaultValue={d.jobId ?? ""}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="rounded-lg border border-line px-2 py-1 text-xs bg-surface outline-none max-w-40"
                >
                  <option value="">— sem vaga —</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </form>

              {/* Toggle IA */}
              <form action={toggleDocumentAi}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="useForAi" value={String(!d.useForAi)} />
                <button
                  type="submit"
                  disabled={!d.hasText}
                  title={d.hasText ? "" : "Sem texto para a IA usar"}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition disabled:opacity-40 ${
                    d.useForAi
                      ? "bg-primary-100 text-primary-700 border-primary-300"
                      : "border-line text-content-muted"
                  }`}
                >
                  {d.useForAi ? "IA: usando ✓" : "IA: ignorar"}
                </button>
              </form>

              <a
                href={`/api/arquivos/${d.filename}?download=true`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary-600 hover:underline"
              >
                Baixar
              </a>
              <form action={deleteDocument} className="inline">
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-800 hover:underline"
                >
                  Remover
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
