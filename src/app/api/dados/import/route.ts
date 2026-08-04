import { ok, fail, preflight, handle, guardPanel } from "@/server/http/api";
import {
  perfilRepo,
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  canadaProfileRepo,
} from "@/server/db/repositories";

export function OPTIONS() {
  return preflight();
}

/**
 * Importa um backup JSON (#19). Substitui o perfil/canada (registros únicos) e
 * ADICIONA experiências/formação/cursos/idiomas (não apaga os existentes — o
 * usuário decide). Ignora ids do backup (recria).
 */
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardPanel();
    if (denied) return denied;

    const dump = await request.json().catch(() => null);
    if (!dump || typeof dump !== "object")
      return fail("Arquivo inválido. Envie um backup JSON do BryanAI.");

    let importados = 0;

    if (dump.perfil) {
      const p = dump.perfil;
      await perfilRepo.upsert({
        nomeCompleto: p.nomeCompleto ?? "",
        email: p.email ?? null,
        telefone: p.telefone ?? null,
        localizacao: p.localizacao ?? null,
        linkedin: p.linkedin ?? null,
        github: p.github ?? null,
        resumoBase: p.resumoBase ?? null,
        dataNascimento: p.dataNascimento ?? null,
      });
      importados++;
    }

    if (dump.canada) {
      const { id: _id, ...canada } = dump.canada;
      await canadaProfileRepo.upsert(canada);
      importados++;
    }

    for (const e of dump.experiencias ?? []) {
      const { id: _id, ...rest } = e;
      await experienciaRepo.create(rest);
      importados++;
    }
    for (const f of dump.formacao ?? []) {
      const { id: _id, ...rest } = f;
      await formacaoRepo.create(rest);
      importados++;
    }
    for (const c of dump.cursos ?? []) {
      const { id: _id, ...rest } = c;
      await cursoRepo.create(rest);
      importados++;
    }
    for (const i of dump.idiomas ?? []) {
      const { id: _id, ...rest } = i;
      await idiomaRepo.create(rest);
      importados++;
    }

    return ok({ importados });
  });
}
