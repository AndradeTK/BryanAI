import { ok, fail, preflight, handle, guardApi } from "@/server/http/api";
import { analyzeJobFit } from "@/server/ai/analyzer";
import { getFullResume } from "@/server/resume/curriculoService";
import { matchFields } from "@/server/apply/answers";
import { documentRepo } from "@/server/db/repositories";

/** Detecta se algum campo do formulário pede uma reference letter / anexo. */
function pedeReferenceLetter(labels: string[]): boolean {
  return labels.some((l) =>
    /reference|letter|recommendation|carta|refer[êe]ncia|recomenda/i.test(l),
  );
}

export function OPTIONS() {
  return preflight();
}

/**
 * Copiloto de aplicação (Fase 10). Prepara — NÃO envia — uma candidatura:
 * pontua a vaga (score + veredictos canadenses) e casa os campos do formulário
 * Easy Apply com respostas salvas / dados do perfil. Campos sem dado voltam
 * como `needs_input` para o usuário preencher (e o app aprender).
 *
 * Body: `{ titulo, descricao, empresa?, url?, campos?: [{label}] | string[] }`
 */
export async function POST(request: Request) {
  return handle(async () => {
    const denied = await guardApi();
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    if (!body?.titulo || !body?.descricao)
      return fail("Envie `titulo` e `descricao`.");

    // Normaliza os labels dos campos (aceita string[] ou {label}[]).
    const labels: string[] = Array.isArray(body.campos)
      ? body.campos
          .map((c: unknown) =>
            typeof c === "string" ? c : (c as { label?: string })?.label,
          )
          .filter((l: unknown): l is string => typeof l === "string" && l.trim().length > 0)
      : [];

    const curriculo = await getFullResume();

    // Se o formulário pede reference letter (ou a descrição menciona), sugere as
    // cartas salvas. O navegador não deixa o Copiloto subir o arquivo sozinho —
    // devolvemos os links para o usuário anexar.
    const pedeCarta =
      pedeReferenceLetter(labels) || pedeReferenceLetter([body.descricao]);

    const [analise, respostas, docs] = await Promise.all([
      analyzeJobFit(curriculo, {
        titulo: body.titulo,
        descricao: body.descricao,
        empresa: body.empresa ?? undefined,
      }),
      labels.length ? matchFields(labels, curriculo) : Promise.resolve([]),
      pedeCarta ? documentRepo.getAll() : Promise.resolve([]),
    ]);

    const documentosSugeridos = pedeCarta
      ? docs
          .filter((d) => d.kind === "reference_letter")
          .map((d) => ({
            id: d.id,
            titulo: d.title,
            url: `/api/arquivos/${d.filename}?download=true`,
          }))
      : [];

    return ok({
      score: analise.score,
      nivel: analise.nivel_compatibilidade,
      canadian: analise.canadian ?? null,
      respostas,
      pedeReferenceLetter: pedeCarta,
      documentosSugeridos,
    });
  });
}
