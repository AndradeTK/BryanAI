"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-2.5 rounded-full text-sm font-medium transition bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-[13px] font-medium text-content mb-1.5"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-line text-content placeholder:text-content-subtle transition outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-[13px] font-medium text-content mb-1.5"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-line text-content placeholder:text-content-subtle transition outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-sm rounded-lg px-3 py-2 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
