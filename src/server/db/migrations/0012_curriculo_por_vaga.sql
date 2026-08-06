-- Liga o currículo gerado à candidatura do kanban.
--
-- Sem isto, cada geração era um arquivo solto: não dava para responder "qual
-- versão eu mandei para essa vaga?" — que é exatamente a pergunta que aparece
-- na véspera de uma entrevista.
--
-- ON DELETE SET NULL: apagar a candidatura não deve apagar o histórico de que
-- o currículo foi gerado; ele só deixa de estar vinculado.
ALTER TABLE "historico_geracoes"
  ADD COLUMN IF NOT EXISTS "application_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historico_geracoes"
   ADD CONSTRAINT "historico_geracoes_application_id_fk"
   FOREIGN KEY ("application_id") REFERENCES "applications"("id")
   ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_application_idx"
  ON "historico_geracoes" ("application_id");
