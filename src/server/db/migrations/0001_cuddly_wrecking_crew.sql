CREATE TYPE "public"."eca_status" AS ENUM('none', 'in_progress', 'wes', 'ices', 'iqas', 'ces', 'icas');--> statement-breakpoint
CREATE TYPE "public"."language_test" AS ENUM('none', 'ielts', 'celpip', 'tef', 'tcf');--> statement-breakpoint
CREATE TYPE "public"."license_status" AS ENUM('na', 'not_started', 'in_progress', 'licensed');--> statement-breakpoint
CREATE TYPE "public"."work_authorization" AS ENUM('citizen', 'pr', 'pgwp', 'owp', 'spouse_owp', 'study_permit', 'needs_lmia', 'needs_sponsorship');--> statement-breakpoint
CREATE TABLE "canada_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_authorization" "work_authorization" DEFAULT 'needs_sponsorship' NOT NULL,
	"authorized_provinces" text[],
	"preferred_provinces" text[],
	"clb_english" integer,
	"nclc_french" integer,
	"language_test" "language_test" DEFAULT 'none',
	"eca_status" "eca_status" DEFAULT 'none',
	"eca_equivalency" text,
	"regulated_profession" varchar(100),
	"license_status" "license_status" DEFAULT 'na',
	"canadian_exp_months" integer DEFAULT 0
);
