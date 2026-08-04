import puppeteer, { type Browser } from "puppeteer";

/**
 * Pool de browser: reusa UMA instância do Chrome entre requests, em vez de
 * lançar um browser novo a cada geração (o overhead de ~600ms-1s do código
 * antigo). Cada render usa browser.newPage() e fecha só a página.
 *
 * O Chrome não fica vivo para sempre: um processo ocioso segura ~200MB, e esta
 * aplicação divide 3.8GB com outra. Depois de IDLE_MS sem uso ele é encerrado e
 * o próximo render paga o custo de subir de novo — troca vantajosa para algo
 * usado em rajadas curtas, com horas de silêncio entre elas.
 */

const IDLE_MS = 5 * 60 * 1000;

let browserPromise: Promise<Browser> | null = null;
let idleTimer: NodeJS.Timeout | null = null;
/** Renders em andamento. O timer só conta quando chega a zero. */
let emUso = 0;

function launchArgs(): string[] {
  const args = ["--disable-dev-shm-usage", "--disable-gpu"];
  // Em container, ou rodando como root, o Chrome recusa o próprio sandbox.
  // Controlado por env porque, com um usuário dedicado, o certo é manter ligado.
  if (process.env.PUPPETEER_NO_SANDBOX === "true") {
    args.push("--no-sandbox", "--disable-setuid-sandbox");
  }
  return args;
}

function cancelarOcioso() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function agendarOcioso() {
  cancelarOcioso();
  idleTimer = setTimeout(() => {
    if (emUso === 0) void closeBrowser();
  }, IDLE_MS);
  // Um timer pendente não deve segurar o processo no encerramento.
  idleTimer.unref?.();
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: launchArgs() });
  }
  const browser = await browserPromise;
  // Se o browser morreu (crash, ou foi encerrado por ociosidade), relança.
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

/**
 * Empresta o browser para uma operação, garantindo que a contagem de uso e o
 * timer de ociosidade fiquem certos mesmo se o render lançar.
 */
export async function comBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  cancelarOcioso();
  emUso++;
  try {
    return await fn(await getBrowser());
  } finally {
    emUso--;
    if (emUso === 0) agendarOcioso();
  }
}

export async function closeBrowser(): Promise<void> {
  cancelarOcioso();
  const pendente = browserPromise;
  browserPromise = null;
  if (pendente) {
    try {
      await (await pendente).close();
    } catch {
      // já morto — nada a fazer
    }
  }
}
