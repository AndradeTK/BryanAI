CREATE TABLE "noc_codes" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"definition" text,
	"teer" varchar(2),
	"embedding" vector(3072)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
CREATE INDEX "noc_embedding_hnsw" ON "noc_codes" USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);