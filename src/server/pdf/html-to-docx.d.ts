declare module "html-to-docx" {
  interface DocxOptions {
    orientation?: "portrait" | "landscape";
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    title?: string;
    font?: string;
    fontSize?: number;
  }
  function HTMLtoDOCX(
    html: string,
    headerHtml?: string | null,
    options?: DocxOptions,
    footerHtml?: string | null,
  ): Promise<Buffer | ArrayBuffer | Blob | Uint8Array>;
  export default HTMLtoDOCX;
}
