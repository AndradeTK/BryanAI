import Link from "next/link";
import { perfilRepo } from "@/server/db/repositories";
import { validateResume } from "@/server/resume/curriculoService";
import { PerfilForm } from "./PerfilForm";
import { ImportarCV } from "./ImportarCV";

export const dynamic = "force-dynamic";

const ISSUE_LINK: Record<string, string> = {
  experiencia: "/experiencias",
  experiências: "/experiencias",
  formação: "/formacao",
  formacao: "/formacao",
  idioma: "/idiomas",
  certificaç: "/cursos",
};

function linkFor(msg: string): string | null {
  const lower = msg.toLowerCase();
  for (const [key, href] of Object.entries(ISSUE_LINK)) {
    if (lower.includes(key)) return href;
  }
  return null;
}

export default async function PerfilPage() {
  const [perfil, validacao] = await Promise.all([
    perfilRepo.get(),
    validateResume(),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Meu Perfil</h1>
      <p className="text-content-subtle mb-6">
        Dados mestres usados em todas as análises e currículos gerados.
      </p>

      <ImportarCV />

      {/* Checklist de completude (#18) */}
      {validacao.issues.length > 0 && (
        <div className="bg-surface rounded-xl border border-line p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-content">
              Perfil {validacao.completude}% completo
            </h2>
          </div>
          <ul className="space-y-1.5">
            {validacao.issues.map((issue, i) => {
              const href = linkFor(issue.mensagem);
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      issue.criticidade === "alta"
                        ? "bg-red-500"
                        : issue.criticidade === "media"
                          ? "bg-yellow-500"
                          : "bg-content-subtle"
                    }`}
                  />
                  {href ? (
                    <Link href={href} className="text-primary-600 hover:underline">
                      {issue.mensagem}
                    </Link>
                  ) : (
                    <span className="text-content-muted">{issue.mensagem}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-line p-6">
        <PerfilForm perfil={perfil} />
      </div>
    </div>
  );
}
