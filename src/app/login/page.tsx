import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar — BryanAI",
};

// A sessão é lida do cookie a cada request; nada aqui pode ser pré-renderizado.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Quem já está autenticado não precisa ver o formulário.
  if (await getCurrentUser()) redirect("/");

  return (
    /* Composição do hero do Antigravity: muito ar em volta, título grande e
       leve com tracking negativo, e o formulário centrado sem peso visual. */
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-surface-2">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-10">
          <h1 className="text-[42px] leading-[1.05] font-medium text-content tracking-[-0.035em]">
            Bryan<span className="text-content-subtle">AI</span>
          </h1>
          <p className="text-content-muted text-[15px] mt-4 leading-relaxed">
            Otimização de currículos e acompanhamento de candidaturas
          </p>
        </div>

        <div className="bg-surface border border-line-soft rounded-2xl p-7">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-content-subtle mt-8">
          Acesso restrito · não há cadastro público
        </p>
      </div>
    </main>
  );
}
