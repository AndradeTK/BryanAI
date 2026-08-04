CREATE TYPE "public"."status_geracao" AS ENUM('processando', 'concluido', 'falha');--> statement-breakpoint
CREATE TYPE "public"."tipo_formacao" AS ENUM('educacao', 'projeto');--> statement-breakpoint
CREATE TABLE "educacao_e_cursos" (
	"id" serial PRIMARY KEY NOT NULL,
	"emissor_instituicao" varchar(255),
	"titulo_do_curso" varchar(255),
	"descricao" text,
	"destaque" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "experiencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa" varchar(255) NOT NULL,
	"cargo" varchar(150) NOT NULL,
	"data_inicio" date,
	"data_fim" date,
	"descricao_atividades" text,
	"principais_conquistas" text,
	"categoria" varchar(100),
	"tags_tecnicas" text[]
);
--> statement-breakpoint
CREATE TABLE "formacao_e_projetos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_formacao" NOT NULL,
	"instituicao_projeto" varchar(255),
	"titulo_curso" varchar(255),
	"status" varchar(100),
	"descricao_detalhada" text
);
--> statement-breakpoint
CREATE TABLE "historico_geracoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vaga_titulo" varchar(255),
	"score" integer,
	"keywords_focadas" text,
	"status" "status_geracao" DEFAULT 'processando',
	"pdf_path" varchar(500),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "idiomas" (
	"id" serial PRIMARY KEY NOT NULL,
	"idioma" varchar(100) NOT NULL,
	"nivel_cefr" varchar(100),
	"certificacao_exame" varchar(255),
	"historico_de_escolas" text
);
--> statement-breakpoint
CREATE TABLE "perfil" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_completo" varchar(255) NOT NULL,
	"email" varchar(150),
	"telefone" varchar(20),
	"localizacao" varchar(255),
	"linkedin" varchar(255),
	"github" varchar(255),
	"resumo_base" text,
	"data_nascimento" date
);
