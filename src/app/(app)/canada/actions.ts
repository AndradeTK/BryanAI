"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { canadaProfileRepo } from "@/server/db/repositories";
import type { NewCanadaProfile } from "@/server/db/schema";

export type ActionState = { error?: string; success?: boolean };

function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function list(v: FormDataEntryValue | null): string[] | null {
  const s = str(v);
  if (!s) return null;
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

export async function saveCanadaProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const data: NewCanadaProfile = {
    workAuthorization: (str(formData.get("workAuthorization")) ??
      "needs_sponsorship") as NewCanadaProfile["workAuthorization"],
    authorizedProvinces: list(formData.get("authorizedProvinces")),
    preferredProvinces: list(formData.get("preferredProvinces")),
    clbEnglish: num(formData.get("clbEnglish")),
    nclcFrench: num(formData.get("nclcFrench")),
    languageTest: (str(formData.get("languageTest")) ??
      "none") as NewCanadaProfile["languageTest"],
    ecaStatus: (str(formData.get("ecaStatus")) ??
      "none") as NewCanadaProfile["ecaStatus"],
    ecaEquivalency: str(formData.get("ecaEquivalency")),
    regulatedProfession: str(formData.get("regulatedProfession")),
    licenseStatus: (str(formData.get("licenseStatus")) ??
      "na") as NewCanadaProfile["licenseStatus"],
    canadianExpMonths: num(formData.get("canadianExpMonths")) ?? 0,
    canadianCity: str(formData.get("canadianCity")),
    canadianPhone: str(formData.get("canadianPhone")),
  };

  await canadaProfileRepo.upsert(data);
  revalidatePath("/canada");
  return { success: true };
}
