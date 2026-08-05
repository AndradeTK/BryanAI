"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Command palette (#22): Ctrl/Cmd+K abre uma busca de navegação entre as telas.
 * Padrão SaaS 2026, sem lib externa.
 */
const DESTINOS: { label: string; href: string; hint?: string }[] = [
  { label: "Dashboard", href: "/" },
  { label: "Meu Perfil", href: "/perfil" },
  { label: "Perfil Canadense", href: "/canada" },
  { label: "Experiências", href: "/experiencias" },
  { label: "Formação e Projetos", href: "/formacao" },
  { label: "Certificações", href: "/cursos" },
  { label: "Idiomas", href: "/idiomas" },
  { label: "Job Fit & Gerador", href: "/jobfit" },
  { label: "Vagas (Kanban)", href: "/jobs" },
  { label: "Cover Letter", href: "/cover-letter" },
  { label: "Skills Gap", href: "/skills-gap" },
  { label: "Documentos", href: "/documentos" },
  { label: "Comparar templates", href: "/preview" },
  { label: "Histórico", href: "/historico" },
  { label: "Configurações", href: "/settings" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          if (next) {
            setQ("");
            setActive(0);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
          return next;
        });
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const filtered = DESTINOS.filter((d) =>
    d.label.toLowerCase().includes(q.toLowerCase()),
  );

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[70] flex items-start justify-center pt-32"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-line rounded-xl w-full max-w-md shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, filtered.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            else if (e.key === "Enter" && filtered[active]) go(filtered[active].href);
          }}
          placeholder="Ir para... (Ctrl+K)"
          className="w-full px-4 py-3 text-sm bg-surface text-content outline-none border-b border-line"
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-sm text-content-subtle">Nada encontrado.</li>
          )}
          {filtered.map((d, i) => (
            <li key={d.href}>
              <button
                onClick={() => go(d.href)}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-4 py-2 text-sm ${
                  i === active ? "bg-accent text-on-accent" : "text-content hover:bg-surface-3"
                }`}
              >
                {d.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
