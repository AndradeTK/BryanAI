-- Tokens de leitura pública do perfil.
--
-- O caso de uso é colar o perfil numa IA de terceiro para pedir análise. A
-- forma ingênua — um /profile.md aberto — publicaria telefone, e-mail e
-- localização numa URL fixa, indexável por buscador e válida para sempre.
--
-- Mesmo padrão da tabela `sessions`: o banco guarda só o SHA-256 do token, e o
-- valor em claro existe uma vez, no momento da criação. Assim um vazamento do
-- banco não entrega os links, e revogar é apagar uma linha — sem redeploy,
-- diferente de um segredo em variável de ambiente.
CREATE TABLE IF NOT EXISTS "public_profile_tokens" (
  "id" serial PRIMARY KEY,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  -- Para o usuário lembrar por que criou este link ("análise no ChatGPT").
  "label" varchar(100),
  -- Contato redigido por padrão: o link existe para uma IA ler o histórico
  -- profissional, não para distribuir telefone e e-mail.
  "redact_contact" boolean NOT NULL DEFAULT true,
  -- NULL = não expira. Expiração é opcional porque o uso tende a ser repetido.
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "last_used_at" timestamptz,
  "use_count" integer NOT NULL DEFAULT 0
);
