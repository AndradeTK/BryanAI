/**
 * Não baixar o Chrome no `npm install`.
 *
 * São ~150MB por instalação — no runner do CI a cada build, e na VPS a cada
 * deploy. O binário usado em produção é o Chrome do sistema, apontado por
 * PUPPETEER_EXECUTABLE_PATH (que o puppeteer lê sozinho no launch()).
 *
 * Em desenvolvimento, se você não tiver Chrome no PATH:
 *   npx puppeteer browsers install chrome
 */
module.exports = {
  skipDownload: true,
};
