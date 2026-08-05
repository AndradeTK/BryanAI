import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

/**
 * O Antigravity usa Google Sans Flex (display) e Google Sans Code (mono) —
 * fontes proprietárias, não distribuídas publicamente. DM Sans é o substituto
 * livre mais próximo: mesma construção geométrica, terminais retos e altura-x
 * generosa, que é o que sustenta os títulos grandes com tracking negativo.
 */
const display = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BryanAI — Otimização de Currículos",
  description: "Análise de compatibilidade com vagas e geração de currículos ATS",
};

// Script inline: aplica .dark antes da pintura (evita flash).
// Aqui só o cookie é consultado — o layout raiz também serve /login, que não
// pode depender do banco (nem faria sentido ler as preferências de alguém que
// ainda não se identificou). A preferência do banco entra em (app)/layout.tsx.
const NO_FLASH = `
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
    if (m && m[1] === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieTheme = (await cookies()).get("theme")?.value;

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${mono.variable} h-full ${cookieTheme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
