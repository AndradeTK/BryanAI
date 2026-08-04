import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
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
    },
  },
});
