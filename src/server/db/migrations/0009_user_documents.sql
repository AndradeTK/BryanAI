DO $$ BEGIN
 CREATE TYPE "document_kind" AS ENUM('reference_letter', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "document_kind" DEFAULT 'reference_letter' NOT NULL,
	"title" varchar(255) NOT NULL,
	"filename" varchar(500) NOT NULL,
	"extracted_text" text,
	"use_for_ai" boolean DEFAULT true NOT NULL,
	"job_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
