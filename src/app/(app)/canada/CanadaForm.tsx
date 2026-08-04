"use client";

import { useActionState } from "react";
import { saveCanadaProfile, type ActionState } from "./actions";
import { Field, Select, SubmitButton } from "@/components/form";
import type { CanadaProfile } from "@/server/db/schema";

export function CanadaForm({ profile }: { profile: CanadaProfile | null }) {
  const [state, action] = useActionState<ActionState, FormData>(
    saveCanadaProfile,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {state.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Perfil canadense salvo.
        </div>
      )}
      {state.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          label="Autorização de trabalho"
          name="workAuthorization"
          defaultValue={profile?.workAuthorization ?? "needs_sponsorship"}
          hint="Seu status legal para trabalhar no Canadá. Se você precisa que a empresa patrocine, escolha LMIA/sponsorship — vagas 'no sponsorship' serão bloqueadas automaticamente."
          options={[
            { value: "citizen", label: "Cidadão canadense" },
            { value: "pr", label: "Permanent Resident (PR)" },
            { value: "pgwp", label: "PGWP (Post-Graduation Work Permit)" },
            { value: "owp", label: "Open Work Permit" },
            { value: "spouse_owp", label: "Spouse Open Work Permit" },
            { value: "study_permit", label: "Study Permit" },
            { value: "needs_lmia", label: "Preciso de LMIA" },
            { value: "needs_sponsorship", label: "Preciso de sponsorship" },
          ]}
        />
        <Field
          label="Meses de experiência canadense"
          name="canadianExpMonths"
          type="number"
          defaultValue={String(profile?.canadianExpMonths ?? 0)}
          hint="Tempo trabalhado no Canadá, em meses. 0 se nunca trabalhou aqui."
        />
        <Field
          label="Províncias autorizadas"
          name="authorizedProvinces"
          placeholder="ON, BC"
          defaultValue={profile?.authorizedProvinces?.join(", ")}
          hint="Siglas separadas por vírgula: ON (Ontário), BC (Colúmbia Britânica), QC (Quebec), AB (Alberta)... Deixe vazio se pode trabalhar em qualquer província."
        />
        <Field
          label="Cidade canadense (usada no CV en-CA/fr-CA)"
          name="canadianCity"
          placeholder="Toronto, ON"
          defaultValue={profile?.canadianCity ?? ""}
        />
        <Field
          label="Telefone canadense (usado no CV en-CA/fr-CA)"
          name="canadianPhone"
          placeholder="+1 (416) 555-0100"
          defaultValue={profile?.canadianPhone ?? ""}
        />
        <Field
          label="Províncias preferidas"
          name="preferredProvinces"
          defaultValue={profile?.preferredProvinces?.join(", ")}
        />
        <Field
          label="CLB Inglês (1-12)"
          name="clbEnglish"
          type="number"
          defaultValue={profile?.clbEnglish != null ? String(profile.clbEnglish) : ""}
          hint="Canadian Language Benchmark. Converta do IELTS: 6.0 geral ≈ CLB 7 · 6.5 ≈ CLB 8 · 7.0 ≈ CLB 9. CELPIP: a nota já é o CLB. Deixe vazio se não avaliado."
        />
        <Field
          label="NCLC Francês (1-12)"
          name="nclcFrench"
          type="number"
          defaultValue={profile?.nclcFrench != null ? String(profile.nclcFrench) : ""}
          hint="Niveaux de compétence linguistique canadiens (o CLB do francês). Do TEF/TCF. Importante para vagas em Quebec. Vazio se não tem."
        />
        <Select
          label="Teste de idioma"
          name="languageTest"
          defaultValue={profile?.languageTest ?? "none"}
          options={[
            { value: "none", label: "Nenhum" },
            { value: "ielts", label: "IELTS" },
            { value: "celpip", label: "CELPIP" },
            { value: "tef", label: "TEF" },
            { value: "tcf", label: "TCF" },
          ]}
        />
        <Select
          label="Status ECA (equivalência de diploma)"
          name="ecaStatus"
          defaultValue={profile?.ecaStatus ?? "none"}
          hint="ECA = Educational Credential Assessment: valida seu diploma estrangeiro no padrão canadense. WES é o mais comum. Escolha o órgão que avaliou (ou 'em andamento')."
          options={[
            { value: "none", label: "Não iniciado" },
            { value: "in_progress", label: "Em andamento" },
            { value: "wes", label: "WES (World Education Services)" },
            { value: "ices", label: "ICES" },
            { value: "iqas", label: "IQAS" },
            { value: "ces", label: "CES" },
            { value: "icas", label: "ICAS" },
          ]}
        />
        <Field
          label="Equivalência ECA (texto)"
          name="ecaEquivalency"
          defaultValue={profile?.ecaEquivalency}
          placeholder="Bachelor's — WES-assessed"
          hint="Como aparece no seu relatório ECA, ex.: 'Bachelor's Degree (Brazilian) — equivalent to a Canadian Bachelor's'. Vai no CV canadense."
        />
        <Field
          label="Profissão regulada"
          name="regulatedProfession"
          defaultValue={profile?.regulatedProfession}
          placeholder="P.Eng, CPA..."
          hint="Só se sua profissão exige licença no Canadá (engenheiro=P.Eng, contador=CPA, médico, enfermeiro...). Deixe vazio para TI/dev e a maioria das áreas."
        />
        <Select
          label="Status da licença"
          name="licenseStatus"
          defaultValue={profile?.licenseStatus ?? "na"}
          options={[
            { value: "na", label: "Não aplica" },
            { value: "not_started", label: "Não iniciado" },
            { value: "in_progress", label: "Em andamento" },
            { value: "licensed", label: "Licenciado" },
          ]}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
