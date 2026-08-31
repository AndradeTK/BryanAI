-- Anexos de referência em experiências e formação/projetos.
--
-- Como no LinkedIn: cada experiência pode apontar para um certificado, um
-- repositório, um artigo, um vídeo. Hoje `experiencias` não tem nenhum campo
-- de link, e `formacao_e_projetos` tem UM só, sem rótulo.
--
-- Tabela própria em vez de generalizar `documents`: aquela tabela existe para
-- alimentar a IA (tem extracted_text, texto_via_ocr, use_for_ai) e ganhou uma
-- coluna de vínculo com vaga. Aqui o propósito é o oposto — referência para o
-- usuário, que NUNCA entra no currículo gerado. Misturar as duas obrigaria a
-- carregar um flag "não use isto" em todo lugar.
--
-- O vínculo é polimórfico (entidade + entidade_id) porque serve a duas tabelas.
-- Postgres não faz FK condicional, então a integridade fica no código — e a
-- limpeza, no delete de cada repositório.
CREATE TABLE IF NOT EXISTS "anexos_referencia" (
  "id" serial PRIMARY KEY,
  -- 'experiencia' | 'formacao'
  "entidade" varchar(20) NOT NULL,
  "entidade_id" integer NOT NULL,
  "rotulo" varchar(150) NOT NULL,
  -- Um dos dois: link externo OU arquivo no volume. Nunca os dois vazios.
  "url" varchar(1000),
  "filename" varchar(500),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "anexo_tem_destino" CHECK ("url" IS NOT NULL OR "filename" IS NOT NULL)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "anexos_entidade_idx"
  ON "anexos_referencia" ("entidade", "entidade_id");
