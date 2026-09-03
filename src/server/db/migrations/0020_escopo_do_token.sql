-- Separa o token que só lê do token que pode propor alterações.
--
-- Até aqui, qualquer link de perfil podia propor escrita pelo MCP. Isso mistura
-- duas coisas com riscos diferentes: o link de leitura nasceu para ser colado
-- numa IA de terceiro — ele vive em histórico de navegador e em configuração
-- de app que não controlamos — enquanto o token do conector fica num lugar só.
-- Um link colado por aí não deveria ganhar o poder de mexer nos dados só
-- porque o sistema passou a ter MCP.
--
-- DEFAULT false: propor é permissão concedida, nunca herdada.
ALTER TABLE "public_profile_tokens"
  ADD COLUMN IF NOT EXISTS "pode_propor" boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- Exceção pontual, e vale explicar: um token que já tem conexão OAuth viva é,
-- por definição, um conector em uso. Zerar a permissão dele derrubaria uma
-- integração que funciona, e o usuário veria "erro de permissão" sem entender
-- que foi uma migração. Preserva-se o que já existe; o default cuida do resto.
UPDATE "public_profile_tokens" t
   SET "pode_propor" = true
 WHERE EXISTS (SELECT 1 FROM "oauth_tokens" o WHERE o."token_id" = t."id");
