-- NOTA: o índice jobs_embedding_hnsw é criado à mão na 0003 (cast halfvec, que o
-- Drizzle não modela), então o generate quer dropá-lo. NÃO dropar — mantido.
ALTER TABLE "applications" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "canada_profile" ADD COLUMN "canadian_city" varchar(255);--> statement-breakpoint
ALTER TABLE "canada_profile" ADD COLUMN "canadian_phone" varchar(30);