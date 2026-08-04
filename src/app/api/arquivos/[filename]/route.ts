import { readGenerated, contentTypeFor } from "@/server/pdf/storage";
import { guardPanel } from "@/server/http/api";

/**
 * Serve os documentos gerados (PDF/DOCX) e os enviados pelo usuário.
 * O storage valida o path (anti path-traversal); nada é servido estaticamente.
 * ?download=true força attachment; senão, inline (para o visualizador).
 *
 * Exige sessão: os arquivos incluem currículos e cartas de recomendação, e o
 * nome deles é previsível o bastante para não servir de segredo.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const denied = await guardPanel();
  if (denied) return denied;

  const { filename } = await params;
  try {
    const buffer = await readGenerated(filename);
    const download = new URL(request.url).searchParams.get("download") === "true";
    const disposition = download ? "attachment" : "inline";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeFor(filename),
        "Content-Disposition": `${disposition}; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json(
      { success: false, error: "Arquivo não encontrado" },
      { status: 404 },
    );
  }
}
