import Link from "next/link";
import { settingsRepo } from "@/server/db/repositories";
import { SettingsForm } from "./SettingsForm";
import { SectionsOrderEditor } from "./SectionsOrderEditor";
import { DadosBackup } from "./DadosBackup";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await settingsRepo.get();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-content mb-1">Configurações</h1>
      <p className="text-content-subtle mb-6">
        Padrões de geração de currículo e preferências gerais.{" "}
        <Link href="/preview" className="text-primary-600 hover:underline">
          Comparar os 5 templates
        </Link>
        .
      </p>

      <div className="bg-surface rounded-xl border border-line p-6 mb-6">
        <SettingsForm settings={settings} />
      </div>

      <div className="bg-surface rounded-xl border border-line p-6">
        <h2 className="text-lg font-semibold text-content mb-1">
          Ordem das seções do currículo
        </h2>
        <p className="text-sm text-content-subtle mb-4">
          Define a ordem em que as seções aparecem no currículo gerado.
        </p>
        <SectionsOrderEditor initial={settings.sectionsOrder} />
      </div>

      <div className="bg-surface rounded-xl border border-line p-6 mt-6">
        <h2 className="text-lg font-semibold text-content mb-1">Backup de dados</h2>
        <p className="text-sm text-content-subtle mb-4">
          Exporte todos os seus dados num arquivo JSON ou importe um backup.
        </p>
        <DadosBackup />
      </div>
    </div>
  );
}
