-- Histórico do assistente no banco.
--
-- A conversa vivia só em localStorage, com o cliente reenviando o histórico a
-- cada turno. Isso significa que ela sumia ao limpar dados do site, não
-- existia em outro navegador ou no celular, e o servidor não tinha registro do
-- que já havia sido discutido — fatos corrigidos na conversa ("na verdade
-- foram dois anos") se perdiam junto.
--
-- Uma conversa por vez é o suficiente para uma ferramenta de um usuário só,
-- mas a tabela de conversas existe para o histórico não virar um fio único e
-- infinito, e para caber o resumo rolante quando a conversa ficar longa.
CREATE TABLE IF NOT EXISTS "chat_conversas" (
  "id" serial PRIMARY KEY,
  "titulo" varchar(200),
  -- Resumo dos turnos antigos, para não crescer o prompt linearmente.
  "resumo_rolante" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chat_mensagens" (
  "id" serial PRIMARY KEY,
  "conversa_id" integer NOT NULL
    REFERENCES "chat_conversas"("id") ON DELETE CASCADE,
  -- 'user' | 'model'
  "papel" varchar(10) NOT NULL,
  "texto" text NOT NULL,
  -- Só o metadado do anexo. O binário não entra aqui: um PDF de 12MB em
  -- base64 por mensagem inflaria o banco sem necessidade — quem guarda
  -- arquivo é a tabela `documents`.
  "anexos_meta" jsonb,
  "created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "chat_mensagens_conversa_idx"
  ON "chat_mensagens" ("conversa_id", "id");
