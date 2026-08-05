import type { ReactNode } from "react";

/**
 * Componentes base (átomos/moléculas) — consolidam os padrões antes repetidos
 * inline em cada página. Todos usam os tokens semânticos (surface/content/line)
 * definidos em globals.css, então funcionam em light e dark automaticamente.
 *
 * A linguagem visual segue o design do Google Antigravity: superfícies quase
 * brancas, bordas hairline em vez de sombras, botões em pílula e hierarquia
 * construída por tipografia e espaço — não por cor.
 */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`bg-surface border border-line-soft rounded-xl ${padded ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        {/* Título grande e leve, com tracking negativo — a assinatura do estilo. */}
        <h1 className="text-3xl font-medium text-content tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-content-muted mt-2 text-[15px] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost";

/**
 * Pílula completa em todas as variantes. O primário é o quase-preto no tema
 * claro e o quase-branco no escuro — `accent`/`on-accent` invertem juntos.
 */
const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  outline:
    "bg-surface border border-line text-content hover:bg-surface-3",
  ghost: "text-content-muted hover:bg-surface-3 hover:text-content",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${BTN_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "primary";

/**
 * Selos discretos: fundo de baixíssimo contraste e texto colorido, em vez de
 * blocos saturados. Mantém a página calma mesmo com muitos status na tela.
 */
const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-content-muted",
  success:
    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  primary: "bg-blue-soft text-blue dark:text-blue",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Escolhe o tom de um score 0-100. */
export function scoreTone(score: number): BadgeTone {
  return score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
}
