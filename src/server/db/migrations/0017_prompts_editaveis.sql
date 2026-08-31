-- Prompts editáveis nas configurações.
--
-- Guarda SÓ a customização. O texto padrão continua em src/server/ai/prompts.ts
-- e nunca é copiado para cá: "restaurar ao padrão" é apagar a linha, e um
-- default que melhora numa versão nova passa a valer sem migração de dados.
--
-- A regra anti-alucinação de métricas NÃO mora aqui. Ela é concatenada depois
-- da customização, a partir de WRITER_REGRAS_IMUTAVEIS, e o editor não a
-- mostra — apagar o que não se vê é impossível.
CREATE TABLE IF NOT EXISTS "prompt_customizacoes" (
  "chave" varchar(60) PRIMARY KEY,
  "texto" text NOT NULL,
  "atualizado_em" timestamptz DEFAULT now()
);
