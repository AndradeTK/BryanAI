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
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface-2">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-content">BryanAI</h1>
          <p className="text-content-muted text-sm mt-1">
            Otimização de currículos e job tracker
          </p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-6">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-content-muted mt-6">
          Acesso restrito. Não há cadastro público.
        </p>
      </div>
    </main>
  );
}
