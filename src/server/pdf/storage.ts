import { writeFile, readFile, mkdir } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { env } from "@/lib/env";

/**
 * Armazenamento dos documentos gerados (PDF/DOCX) e dos enviados pelo usuário.
 * Fica FORA de qualquer diretório servido estaticamente — o acesso passa só
 * pelo route handler /api/arquivos, que valida o path.
 *
 * O caminho vem de STORAGE_DIR porque em produção o deploy substitui o
 * diretório do release inteiro: guardar sob process.cwd() apagaria as cartas de
 * recomendação anexadas a cada release.
 */
const OUTPUT_DIR = resolve(process.cwd(), env.STORAGE_DIR);

async function ensureDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

export function generateFilename(prefix: string, ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}.${ext}`;
}

/** Resolve um filename dentro de OUTPUT_DIR, rejeitando path traversal. */
export function resolveInside(filename: string): string {
  const base = resolve(OUTPUT_DIR);
  const target = resolve(base, filename);
  const rel = relative(base, target);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Nome de arquivo inválido");
  }
  return target;
}

export async function saveGenerated(
  filename: string,
  buffer: Buffer,
): Promise<string> {
  await ensureDir();
  const path = resolveInside(filename);
  await writeFile(path, buffer);
  return path;
}

export async function readGenerated(filename: string): Promise<Buffer> {
  return readFile(resolveInside(filename));
}

export function contentTypeFor(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}
