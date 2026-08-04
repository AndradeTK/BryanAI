CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('saved', 'applied', 'interview', 'offer', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"status" "application_status" DEFAULT 'saved' NOT NULL,
	"score" integer,
	"notes" text,
	"applied_at" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(300) NOT NULL,
	"empresa" varchar(255),
	"descricao" text NOT NULL,
	"localizacao" varchar(255),
	"url" varchar(1000),
	"source" varchar(50) DEFAULT 'manual' NOT NULL,
	"noc_code" varchar(10),
	"noc_confidence" real,
	"salary_raw" varchar(255),
	"date_posted" date,
	"dedup_hash" varchar(64) NOT NULL,
	"embedding" vector(3072),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "jobs_dedup_hash_unique" UNIQUE("dedup_hash")
);
--> statement-breakpoint
CREATE TABLE "profile_embedding" (
	"id" serial PRIMARY KEY NOT NULL,
	"embedding" vector(3072) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_embedding_hnsw" ON "jobs" USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
