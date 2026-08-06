import type { Metadata } from "next";
import { settingsRepo } from "@/server/db/repositories";
import { EntrevistaClient } from "./EntrevistaClient";

export const metadata: Metadata = { title: "Preparação para entrevista — BryanAI" };
export const dynamic = "force-dynamic";

export default async function EntrevistaPage() {
  const settings = await settingsRepo.get();
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-content tracking-tight">
          Preparação para entrevista
        </h1>
        <p className="text-content-muted mt-2 text-[15px] leading-relaxed">
          Cruza a vaga com o seu perfil e suas cartas: quais perguntas essa vaga
          provavelmente fará, com qual experiência sua responder cada uma, e
          onde você não tem material — para preparar em vez de improvisar.
        </p>
      </div>
      <EntrevistaClient idiomaPadrao={settings.idiomaDefault} />
    </div>
  );
}
