import "server-only";
import HTMLtoDOCX from "html-to-docx";
import { comBrowser } from "./browser";
import {
  ResumeBody,
  getTemplateCss,
  isTemplateId,
  type TemplateId,
  type ResumeTemplateProps,
} from "@/components/resume-templates";

/**
 * O caminho do PDF — o motivo de trocar EJS por React.
 *
 * O MESMO componente <ResumeBody> que a página de preview mostra é passado por
 * renderToStaticMarkup aqui e alimenta o Puppeteer. Um código, dois destinos:
 * preview e PDF nunca divergem.
 *
 * renderToStaticMarkup (não renderToString) porque é HTML morto indo para o
 * Chrome — sem hidratação.
 */

/**
 * Envolve o corpo do currículo + CSS num documento HTML completo.
 * O import de react-dom/server é dinâmico (dentro da função) para o Turbopack
 * não bloqueá-lo na cadeia de Server Component — o uso aqui é intencional:
 * gerar HTML como string para Puppeteer/DOCX, não renderizar JSX na resposta.
 */
export async function renderResumeHtml(
  templateId: string,
  props: ResumeTemplateProps,
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const id: TemplateId = isTemplateId(templateId) ? templateId : "minimalista";
  const css = getTemplateCss(id);
  const body = renderToStaticMarkup(<ResumeBody templateId={id} {...props} />);
  const lang = props.lang ?? "pt-BR";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

export interface PdfResult {
  buffer: Buffer;
}

/** Gera o PDF do currículo a partir do template + dados. */
export async function renderResumePdf(
  templateId: string,
  props: ResumeTemplateProps,
): Promise<PdfResult> {
  const html = await renderResumeHtml(templateId, props);
  return comBrowser(async (browser) => {
    const page = await browser.newPage();
    try {
      // Puppeteer 25: setContent aceita só 'load'/'domcontentloaded' (networkidle
      // é exclusivo de goto). 'load' basta para HTML estático.
      await page.setContent(html, { waitUntil: "load", timeout: 30000 });
      await page.evaluateHandle("document.fonts.ready");
      const buffer = Buffer.from(
        await page.pdf({
          /**
           * Letter, não A4. Canadá e EUA usam 8.5×11 pol (216×279mm); A4 é
           * 210×297 — mais estreito e mais alto. Um currículo em A4 impresso
           * por recrutador canadense sai com margens erradas e pode empurrar
           * conteúdo para uma página extra. Fora que o formato em si já sinaliza
           * "documento de fora".
           */
          format: "Letter",
          margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
          printBackground: true,
          preferCSSPageSize: true,
        }),
      );
      return { buffer };
    } finally {
      await page.close(); // fecha só a página; o browser fica no pool
    }
  });
}

/** Gera o DOCX do currículo a partir do template + dados. */
export async function renderResumeDocx(
  templateId: string,
  props: ResumeTemplateProps,
): Promise<PdfResult> {
  const html = await renderResumeHtml(templateId, props);
  const result = await HTMLtoDOCX(html, null, {
    orientation: "portrait",
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
    title: "Currículo",
    font: "Arial",
    fontSize: 11,
  });
  // html-to-docx pode resolver para Buffer, ArrayBuffer ou Blob conforme o
  // ambiente — normalizamos para Buffer antes de gravar no disco.
  const buffer = await toBuffer(result);
  return { buffer };
}

async function toBuffer(
  data: Buffer | ArrayBuffer | Blob | Uint8Array,
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  // Blob
  return Buffer.from(new Uint8Array(await data.arrayBuffer()));
}
