import puppeteer, { type Browser } from "puppeteer";

/**
 * Pool de browser: reusa UMA instância do Chrome entre requests, em vez de
 * lançar um browser novo a cada geração (o overhead de ~300ms-1s do código
 * antigo). Cada render usa browser.newPage() e fecha só a página.
 */

let browserPromise: Promise<Browser> | null = null;

function launchArgs(): string[] {
  const args = ["--disable-dev-shm-usage", "--disable-gpu"];
  // Em container (sem sandbox do SO) é preciso desligar o sandbox do Chrome.
  // Fora dele, rodar COM sandbox é mais seguro. Controlado por env.
  if (process.env.PUPPETEER_NO_SANDBOX === "true") {
    args.push("--no-sandbox", "--disable-setuid-sandbox");
  }
  return args;
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: launchArgs(),
    });
  }
  const browser = await browserPromise;
  // Se o browser morreu (crash), relança.
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
  }
}
