import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Componentes são .tsx; sem isto o vitest só compila TypeScript e falha ao
  // encontrar JSX. `automatic` dispensa importar React em cada arquivo.
  // O vitest 4 usa oxc, não esbuild — opções de esbuild aqui são ignoradas.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    globals: true,
    environment: "node",
    // Só os testes do projeto: _legacy e agents/ ficam de fora.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "_legacy", "agents"],
    // Valores de fachada: src/lib/env.ts valida no import, e vários módulos sob
    // teste o importam em cascata. Nenhum destes toca serviço externo real.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
      GEMINI_API_KEY: "test-key",
      AUTH_SECRET: "test-secret-com-no-minimo-32-caracteres-aqui",
      STORAGE_DIR: "./generated",
      APP_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` existe para explodir se um módulo de servidor for
      // importado no cliente. Sob teste isso não se aplica — e sem o atalho,
      // qualquer arquivo que o importe fica intestável.
      "server-only": fileURLToPath(new URL("./src/testes/vazio.ts", import.meta.url)),
    },
  },
});
