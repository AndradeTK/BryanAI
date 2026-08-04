import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build enxuto para a VPS: o `next build` emite .next/standalone com apenas
  // as dependências realmente alcançadas pelo trace. O deploy copia isso em vez
  // de um node_modules de ~1GB — importante num servidor de 3.8GB de RAM.
  output: "standalone",

  /**
   * Identidade do build, usada para detectar descompasso de versão.
   *
   * O id de cada Server Action é derivado do build. Quando um deploy troca o
   * release com uma aba aberta, o formulário daquela aba envia um id que o
   * servidor novo não conhece, e o Next responde com um erro opaco — foi o que
   * aconteceu ao tentar entrar durante um deploy: "this page couldn't load".
   *
   * Com deploymentId, o cliente passa a mandar qual build ele carregou; ao
   * detectar a divergência, o router recarrega a página sozinho em vez de
   * falhar. O CI passa o SHA do commit.
   */
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,

  // Pacotes que precisam ser exigidos em runtime pelo Node, não empacotados
  // pelo bundler: têm binários, leem arquivos próprios ou usam APIs nativas.
  serverExternalPackages: [
    "puppeteer",
    "pdf-parse",
    "mammoth",
    "html-to-docx",
    // Também mantém o driver em node_modules dentro do standalone, que é o que
    // permite scripts/migrate.mjs e scripts/create-user.mjs rodarem a partir do
    // diretório do release — sem eles o deploy não aplica migration nem cria
    // usuário sem um checkout completo do projeto na VPS.
    "postgres",
  ],

  // A geração de PDF/DOCX e as chamadas ao Gemini passam de 30s no pior caso
  // (retry com backoff). O default do Next mataria a request antes.
  experimental: {
    proxyTimeout: 120_000,
  },
};

export default nextConfig;
