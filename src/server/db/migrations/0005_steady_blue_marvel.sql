ALTER TABLE "educacao_e_cursos" ADD COLUMN "link" varchar(1000);--> statement-breakpoint
ALTER TABLE "experiencias" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "formacao_e_projetos" ADD COLUMN "link" varchar(1000);--> statement-breakpoint
ALTER TABLE "formacao_e_projetos" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "idiomas" ADD COLUMN "link" varchar(1000);