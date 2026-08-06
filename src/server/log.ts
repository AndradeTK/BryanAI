import "server-only";
import pino from "pino";
import { isProd } from "@/lib/env";

/**
 * Log estruturado.
 *
 * `console.error` não dá para consultar: quando algo falhou em produção, a
 * única saída era ler `pm2 logs` de olho. Com JSON estruturado dá para
 * perguntar "quais chamadas passaram de 30s" ou "quanto de token gastei ontem"
 * — que é exatamente o que faltava para enxergar consumo da cota do Gemini.
 *
 * Em produção sai JSON de uma linha (o PM2 grava em arquivo, e `jq` consulta).
 * Em desenvolvimento, texto legível.
 */
export const log = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: undefined, // sem pid/hostname: é um processo só, o ruído não ajuda
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
});

/**
 * Registra uma chamada ao modelo com o que importa para custo e desempenho.
 * Chamado pelo client de IA, não pelas features — assim nenhuma chamada escapa.
 */
export function logChamadaIa(dados: {
  operacao: string;
  modelo: string;
  ms: number;
  tokensEntrada?: number;
  tokensSaida?: number;
  tokensPensamento?: number;
  finishReason?: string;
  erro?: string;
}) {
  const evento = { tipo: "ia", ...dados };
  if (dados.erro) log.error(evento, `IA ${dados.operacao} falhou`);
  else log.info(evento, `IA ${dados.operacao}`);
}
