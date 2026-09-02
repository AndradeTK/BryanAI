-- Authorization server OAuth 2.1 mínimo, para o conector do Claude.
--
-- O Bearer estático que a Fase 2 usa funciona no Claude Code, onde o comando
-- aceita um header fixo. Não funciona no app: ali "Add custom connector" só
-- oferece OAuth, e o modo de header fixo (static_headers) é beta liberado a
-- poucas organizações.
--
-- Duas tabelas, não três: anunciando CIMD
-- (client_id_metadata_document_supported), o Claude se identifica por uma URL
-- hospedada por ele mesmo e não precisamos de registro dinâmico de clientes
-- nem da tabela que o acompanharia.
--
-- Como em `sessions` e `public_profile_tokens`, o banco guarda só o SHA-256:
-- um dump não entrega credencial viva.
CREATE TABLE IF NOT EXISTS "oauth_codes" (
  "code_hash" varchar(64) PRIMARY KEY,
  -- Cliente que pediu — a URL do CIMD. Guardado para exibir na tela de
  -- consentimento e conferir no /token.
  "client_id" varchar(500) NOT NULL,
  "redirect_uri" varchar(500) NOT NULL,
  -- PKCE S256. O Claude sempre manda, e sem isto um code interceptado seria
  -- trocado por token por quem o interceptou.
  "code_challenge" varchar(128) NOT NULL,
  -- Qual token de perfil o consentimento veste — é o que liga a autorização
  -- OAuth às permissões que já existem.
  "token_id" integer REFERENCES "public_profile_tokens"("id") ON DELETE CASCADE,
  -- 60 segundos. Um authorization code é para ser trocado imediatamente; vida
  -- longa aqui só amplia a janela de quem o roubar.
  "expira_em" timestamptz NOT NULL DEFAULT now() + interval '60 seconds',
  "criado_em" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "oauth_tokens" (
  "id" serial PRIMARY KEY,
  "access_hash" varchar(64) NOT NULL UNIQUE,
  -- Rotacionado a cada refresh: a spec exige para cliente público, e é o que
  -- limita o estrago de um refresh token vazado.
  "refresh_hash" varchar(64) UNIQUE,
  "client_id" varchar(500) NOT NULL,
  "token_id" integer REFERENCES "public_profile_tokens"("id") ON DELETE CASCADE,
  "expira_em" timestamptz NOT NULL,
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "ultimo_uso" timestamptz
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "oauth_tokens_refresh_idx"
  ON "oauth_tokens" ("refresh_hash");
