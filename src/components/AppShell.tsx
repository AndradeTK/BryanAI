"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "./CommandPalette";
import { Icone, type NomeIcone } from "./Icone";
import { logout } from "@/app/login/actions";

/**
 * Shell da aplicação: sidebar fixa + topbar com toggle de tema.
 * O tema é controlado por classe .dark no <html> (setada aqui e no script
 * anti-flash do layout) e persistido num cookie de 1 ano.
 */

const NAV: {
  section: string | null;
  items: { href: string; label: string; icon: NomeIcone }[];
}[] = [
  { section: null, items: [{ href: "/", label: "Dashboard", icon: "dashboard" }] },
  {
    section: "Gestão de Dados",
    items: [
      { href: "/perfil", label: "Meu Perfil", icon: "perfil" },
      { href: "/canada", label: "Perfil Canadense", icon: "canada" },
      { href: "/experiencias", label: "Experiências", icon: "experiencias" },
      { href: "/formacao", label: "Formação e Projetos", icon: "formacao" },
      { href: "/cursos", label: "Certificações", icon: "certificacoes" },
      { href: "/idiomas", label: "Idiomas", icon: "idiomas" },
    ],
  },
  {
    section: "Inteligência",
    items: [
      { href: "/assistente", label: "Assistente", icon: "assistente" },
      { href: "/jobfit", label: "Job Fit & Gerador", icon: "jobfit" },
      { href: "/entrevista", label: "Entrevista", icon: "entrevista" },
      { href: "/jobs", label: "Vagas (Kanban)", icon: "vagas" },
      { href: "/cover-letter", label: "Cover Letter", icon: "carta" },
      { href: "/skills-gap", label: "Skills Gap", icon: "skills" },
      { href: "/documentos", label: "Documentos", icon: "documentos" },
      { href: "/historico", label: "Histórico", icon: "historico" },
    ],
  },
  {
    section: "Sistema",
    items: [
      { href: "/aprendizado", label: "Aprendizado", icon: "aprendizado" },
      { href: "/settings", label: "Configurações", icon: "config" },
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
  "/assistente": "Assistente",
  "/jobfit": "Job Fit & Gerador",
  "/entrevista": "Preparação para entrevista",
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
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-line-soft z-50 flex flex-col">
        <div className="px-6 py-7">
          <h1 className="text-xl font-medium tracking-tight text-content">
            Bryan<span className="text-content-subtle">AI</span>
          </h1>
          <p className="text-xs text-content-subtle mt-1.5">
            Otimização de currículos · Canadá
          </p>
        </div>

        <nav className="px-3 flex-1 overflow-y-auto">
          {NAV.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.section && (
                <span className="block px-3 pt-5 pb-2 text-[11px] font-medium text-content-subtle tracking-wide">
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
                        aria-current={active ? "page" : undefined}
                        /* Item ativo em pílula preenchida — o mesmo tratamento
                           do botão primário, para a navegação ler como uma
                           família só de controles. */
                        className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-[13px] transition ${
                          active
                            ? "bg-accent text-on-accent font-medium"
                            : "text-content-muted hover:bg-surface-3 hover:text-content"
                        }`}
                      >
                        <Icone
                          nome={item.icon}
                          tamanho="1.15em"
                          className={active ? "" : "opacity-70"}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-line-soft space-y-3">
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
                  className="flex items-center gap-1.5 text-xs text-content-subtle hover:text-content transition px-2.5 py-1 rounded-full hover:bg-surface-3"
                >
                  <Icone nome="sair" tamanho="1em" />
                  Sair
                </button>
              </form>
            </div>
          )}
          <p className="text-[11px] text-content-subtle text-center">
            Criado por Bryan Andrade
          </p>
        </div>
      </aside>

      <div className="ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 h-16 bg-surface-2/80 backdrop-blur-md border-b border-line-soft flex items-center justify-between px-10">
          <span className="text-[13px] text-content-muted">{title}</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-content-subtle border border-line rounded-full px-2.5 py-1 font-mono">
              Ctrl+K
            </span>
            <button
              onClick={toggleTheme}
              aria-label="Alternar tema"
              className="w-9 h-9 rounded-full text-content-muted hover:bg-surface-3 hover:text-content transition flex items-center justify-center"
            >
              <Icone nome={dark ? "claro" : "escuro"} tamanho="1.15em" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-10 py-10 max-w-[1100px] w-full mx-auto">{children}</main>
      </div>
      <CommandPalette />
    </>
  );
}
