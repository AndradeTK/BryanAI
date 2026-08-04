import { canadaProfileRepo } from "@/server/db/repositories";
import { CanadaForm } from "./CanadaForm";

export const dynamic = "force-dynamic";

export default async function CanadaPage() {
  const profile = await canadaProfileRepo.get();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-content mb-1">Perfil Canadense</h1>
      <p className="text-content-subtle mb-8">
        Dados usados para adaptar a análise e o currículo ao mercado canadense:
        autorização de trabalho, nível de idioma (CLB/NCLC), equivalência de
        diploma (ECA) e profissão regulada.
      </p>
      <div className="bg-surface rounded-xl border border-line p-6">
        <CanadaForm profile={profile} />
      </div>
    </div>
  );
}
