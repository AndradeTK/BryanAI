import { validateResume } from "@/server/resume/curriculoService";
import { settingsRepo } from "@/server/db/repositories";
import { JobFitClient } from "./JobFitClient";

export const dynamic = "force-dynamic";

export default async function JobFitPage() {
  const [validacao, settings] = await Promise.all([
    validateResume(),
    settingsRepo.get(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Job Fit & Gerador</h1>
      <p className="text-content-subtle mb-6">
        Analise a compatibilidade do seu currículo com uma vaga e gere uma versão
        otimizada.
      </p>

      {!validacao.valido && (
        <div className="rounded-lg bg-yellow-50 text-yellow-800 px-4 py-3 text-sm mb-6">
          Seu perfil está {validacao.completude}% completo. Complete os dados
          essenciais para melhores resultados.
        </div>
      )}

      <JobFitClient
        defaultTemplate={settings.templatePadrao}
        defaultIdioma={settings.idiomaDefault}
      />
    </div>
  );
}
