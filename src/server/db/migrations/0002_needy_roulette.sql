CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_padrao" varchar(50) DEFAULT 'minimalista' NOT NULL,
	"idioma_default" varchar(10) DEFAULT 'pt-BR' NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"sections_order" jsonb DEFAULT '["summary","experience","skills","education","certifications","languages","projects"]'::jsonb NOT NULL,
	"preferencias" jsonb DEFAULT '{"incluirProjetos":true,"limiteCertificacoes":6,"formatoDataExperiencia":"MMM YYYY","mostrarPortfolio":true,"mostrarGithub":true}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
