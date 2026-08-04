"use server";

import { requireUser } from "@/server/auth";

import { revalidatePath } from "next/cache";
import { historicoRepo } from "@/server/db/repositories";

/** Remove um registro do histórico. */
export async function deleteHistorico(id: number): Promise<void> {
  await requireUser();

  await historicoRepo.remove(id);
  revalidatePath("/historico");
  revalidatePath("/documentos");
  revalidatePath("/");
}
