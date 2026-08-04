import type { ReactNode } from "react";

/**
 * Componentes base (átomos/moléculas) — consolidam os padrões antes repetidos
 * inline em cada página. Todos usam os tokens semânticos (surface/content/line)
 * definidos em globals.css, então funcionam em light e dark automaticamente.
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
      className={`bg-surface border border-line rounded-xl ${padded ? "p-6" : ""} ${className}`}
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
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-content">{title}</h1>
        {subtitle && <p className="text-content-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost";

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
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
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${BTN_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "primary";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-content-muted",
  success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300",
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
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Escolhe o tom de um score 0-100. */
export function scoreTone(score: number): BadgeTone {
  return score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
}
