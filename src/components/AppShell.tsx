"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "./CommandPalette";
import { logout } from "@/app/login/actions";

/**
 * Shell da aplicação: sidebar fixa + topbar com toggle de tema.
 * O tema é controlado por classe .dark no <html> (setada aqui e no script
 * anti-flash do layout) e persistido num cookie de 1 ano.
 */

const NAV: { section: string | null; items: { href: string; label: string; icon: string }[] }[] = [
  { section: null, items: [{ href: "/", label: "Dashboard", icon: "▣" }] },
  {
    section: "Gestão de Dados",
    items: [
      { href: "/perfil", label: "Meu Perfil", icon: "◉" },
      { href: "/canada", label: "Perfil Canadense", icon: "🍁" },
      { href: "/experiencias", label: "Experiências", icon: "≣" },
      { href: "/formacao", label: "Formação e Projetos", icon: "◈" },
      { href: "/cursos", label: "Certificações", icon: "✦" },
      { href: "/idiomas", label: "Idiomas", icon: "⌘" },
    ],
  },
  {
    section: "Inteligência",
    items: [
      { href: "/jobfit", label: "Job Fit & Gerador", icon: "◎" },
      { href: "/jobs", label: "Vagas (Kanban)", icon: "▦" },
      { href: "/cover-letter", label: "Cover Letter", icon: "✉" },
      { href: "/skills-gap", label: "Skills Gap", icon: "◭" },
      { href: "/documentos", label: "Documentos", icon: "▤" },
      { href: "/historico", label: "Histórico", icon: "↻" },
    ],
  },
  {
    section: "Sistema",
    items: [
      { href: "/aprendizado", label: "Aprendizado", icon: "🧠" },
      { href: "/settings", label: "Configurações", icon: "⚙" },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/perfil": "Meu Perfil",
  "/canada": "Perfil Canadense",
  "/experiencias": "Experiências",
  "/formacao": "Formação e Projetos",
  "/cursos": "Certificações",
  "/idiomas": "Idiomas",
  "/jobfit": "Job Fit & Gerador",
  "/jobs": "Vagas",
  "/cover-letter": "Cover Letter",
  "/skills-gap": "Skills Gap",
  "/documentos": "Documentos",
  "/historico": "Histórico",
  "/aprendizado": "Aprendizado",
  "/settings": "Configurações",
};

export function AppShell({
  children,
  initialDark,
  userEmail,
}: {
  children: React.ReactNode;
  initialDark: boolean;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [dark, setDark] = useState(initialDark);

  // O layout raiz aplica .dark a partir do cookie, porque também serve /login e
  // não pode consultar o banco. Quando não há cookie e a preferência vem só do
  // settings, é aqui que a classe entra.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", initialDark);
  }, [initialDark]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  const title =
    TITLES[pathname] ??
    (Object.entries(TITLES).find(([h]) => h !== "/" && pathname.startsWith(h))?.[1] ??
      "BryanAI");

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-line z-50 flex flex-col">
        <div className="p-6 border-b border-line">
          <h1 className="text-2xl font-bold text-primary-500">
            <span className="text-content">Bryan</span>AI
          </h1>
          <p className="text-xs text-content-subtle mt-1">
            Otimização de Currículos · Canadá
          </p>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          {NAV.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.section && (
                <span className="block px-3 pt-4 pb-1 text-[11px] font-semibold text-content-subtle uppercase tracking-wider">
                  {group.section}
                </span>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                          active
                            ? "bg-primary-600 text-white"
                            : "text-content-muted hover:bg-surface-3 hover:text-content"
                        }`}
                      >
                        <span className="w-4 text-center opacity-80">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-line space-y-2">
          {userEmail && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs text-content-muted truncate flex-1"
                title={userEmail}
              >
                {userEmail}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs text-content-subtle hover:text-content underline underline-offset-2 transition"
                >
                  Sair
                </button>
              </form>
            </div>
          )}
          <p className="text-xs text-content-subtle text-center">
            Criado por Bryan Andrade
          </p>
        </div>
      </aside>

      <div className="ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 h-14 bg-surface/80 backdrop-blur border-b border-line flex items-center justify-between px-8">
          <span className="text-sm font-medium text-content-muted">{title}</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-content-subtle border border-line rounded px-2 py-1">
              Ctrl+K
            </span>
            <button
              onClick={toggleTheme}
              aria-label="Alternar tema"
              className="w-9 h-9 rounded-lg text-content-muted hover:bg-surface-3 hover:text-content transition flex items-center justify-center"
            >
              {dark ? "☀" : "☾"}
            </button>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
      <CommandPalette />
    </>
  );
}
