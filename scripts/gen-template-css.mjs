// Gera src/components/resume-templates/styles.ts embutindo os CSS como strings.
// Motivo: fs.readFileSync de src/ não sobrevive ao build standalone do Next.
// Rodar: node scripts/gen-template-css.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/components/resume-templates/styles";
const ids = ["minimalista", "classico", "executivo", "harvard", "tech"];

let out =
  "// GERADO por scripts/gen-template-css.mjs — não editar à mão.\n" +
  "// CSS dos templates embutido como strings para sobreviver ao build\n" +
  "// standalone (fs.readFileSync de src/ não vai para o output).\n\n";

for (const id of ids) {
  const css = readFileSync(join(DIR, `${id}.css`), "utf8");
  // JSON.stringify escapa aspas, barras e quebras de linha de forma segura.
  out += `export const ${id} = ${JSON.stringify(css)};\n\n`;
}

out +=
  "export const TEMPLATE_CSS: Record<string, string> = " +
  "{ minimalista, classico, executivo, harvard, tech };\n";

writeFileSync("src/components/resume-templates/styles.ts", out);
console.log("gerado styles.ts");
