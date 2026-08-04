import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/server/auth";
import { settingsRepo } from "@/server/db/repositories";

/**
 * Layout de tudo que exige login.
 *
 * O `requireUser()` aqui é a checagem que vale para as páginas: consulta o banco
 * e redireciona para /login se a sessão não resolver. O middleware, que roda
 * antes, só olha se o cookie existe — é filtro barato, não autorização. As
 * Server Actions não passam por este layout e por isso trazem o guard próprio.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  const [cookieStore, settings] = await Promise.all([
    cookies(),
    settingsRepo.get(),
  ]);

  const cookieTheme = cookieStore.get("theme")?.value;
  const initialDark = cookieTheme ? cookieTheme === "dark" : settings.darkMode;

  return (
    <AppShell initialDark={initialDark} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
