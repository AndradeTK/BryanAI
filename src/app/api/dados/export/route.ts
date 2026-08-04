import {
  perfilRepo,
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  canadaProfileRepo,
} from "@/server/db/repositories";
import { guardPanel } from "@/server/http/api";

/**
 * Exporta todos os dados do perfil como JSON (#19) — backup para uma ferramenta
 * pessoal sem cloud. Baixa como arquivo.
 *
 * É a rota que devolve mais dado pessoal de uma vez; só sessão do painel.
 */
export async function GET() {
  const denied = await guardPanel();
  if (denied) return denied;

  const [perfil, experiencias, formacao, cursos, idiomas, canada] =
    await Promise.all([
      perfilRepo.get(),
      experienciaRepo.getAll(),
      formacaoRepo.getAll(),
      cursoRepo.getAll(),
      idiomaRepo.getAll(),
      canadaProfileRepo.get(),
    ]);

  const dump = {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    perfil,
    experiencias,
    formacao,
    cursos,
    idiomas,
    canada,
  };

  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bryanai-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
