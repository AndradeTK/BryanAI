"use client";

import { useEffect, useState } from "react";

/**
 * Feedback para as operações de IA, que levam de 10 a 60 segundos.
 *
 * Antes o único sinal era o botão desabilitado — indistinguível de uma tela
 * travada, ainda mais porque `withRetry` pode esticar o pior caso até uns 30s
 * de espera silenciosa. Aqui o usuário vê o tempo correndo e uma descrição do
 * que está acontecendo, então sabe que o sistema está vivo.
 *
 * As etapas são baseadas em tempo, não em progresso real: o backend responde de
 * uma vez, sem streaming. Por isso a barra não promete percentual — ela indica
 * atividade. Prometer "70%" sem saber seria mentir para o usuário.
 */
export function Progresso({
  ativo,
  etapas,
  className = "",
}: {
  ativo: boolean;
  /** Marcos em segundos: a partir de `apos`, mostra `texto`. */
  etapas?: { apos: number; texto: string }[];
  className?: string;
}) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (!ativo) {
      setSegundos(0);
      return;
    }
    const inicio = Date.now();
    const t = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicio) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [ativo]);

  if (!ativo) return null;

  const marcos = etapas ?? [
    { apos: 0, texto: "Enviando para a IA…" },
    { apos: 8, texto: "Analisando o conteúdo…" },
    { apos: 25, texto: "Ainda processando — respostas longas levam mais tempo." },
    {
      apos: 50,
      texto:
        "Está demorando mais que o normal. Se a cota da API estiver no limite, há novas tentativas automáticas em andamento.",
    },
  ];
  const atual = [...marcos].reverse().find((m) => segundos >= m.apos)?.texto ?? "";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border border-line-soft bg-surface-2 px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Barra indeterminada: sinaliza atividade sem fingir saber a fração. */}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-1/3 rounded-full bg-accent animate-[progresso_1.4s_ease-in-out_infinite]" />
        </div>
        <span className="text-xs tabular-nums text-content-subtle shrink-0">
          {segundos}s
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-content-muted">{atual}</p>

      <style>{`
        @keyframes progresso {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[progresso_1\\.4s_ease-in-out_infinite\\] {
            animation: none;
            width: 100%;
            opacity: .4;
          }
        }
      `}</style>
    </div>
  );
}
