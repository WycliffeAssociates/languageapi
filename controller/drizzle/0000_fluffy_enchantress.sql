DO $$ BEGIN
 CREATE TYPE "direction" AS ENUM('ltr', 'rtl');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "type_id" AS ENUM('text', 'audio', 'video', 'braille');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "domain" AS ENUM('scripture', 'gloss', 'parascriptural', 'peripheral');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "language" (
	"ietf_code" varchar PRIMARY KEY NOT NULL,
	"national_name" text NOT NULL,
	"english_name" text NOT NULL,
	"direction" "direction" NOT NULL,
	"iso6393" varchar,
	"created_on" timestamp,
	"modified_on" timestamp(0),
	"is_oral_language" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wa_language_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"ietf_code" varchar NOT NULL,
	"show_on_biel" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "language_alternate_name" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ietf_code" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "languages_to_languages" (
	"gateway_language_ietf" varchar,
	"gateway_language_to_ietf" varchar,
	PRIMARY KEY("gateway_language_ietf","gateway_language_to_ietf")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"language_id" varchar NOT NULL,
	"name" varchar(256),
	"type" "type_id" NOT NULL,
	"domain" "domain",
	"resource_type" text,
	"git_id" integer,
	"created_on" timestamp,
	"modified_on" timestamp,
	"level" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wa_content_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar(256) NOT NULL,
	"show_on_biel" boolean NOT NULL,
	"status" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connected_content" (
	"content_id_1" varchar(256) NOT NULL,
	"content_id_2" varchar(256) NOT NULL,
	PRIMARY KEY("content_id_1","content_id_2")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "git_repo" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar NOT NULL,
	"username" varchar NOT NULL,
	"repo_name" varchar NOT NULL,
	"repo_url" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_type" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rendering" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar NOT NULL,
	"file_type_id" serial NOT NULL,
	"file_size_bytes" integer,
	"url" text NOT NULL,
	"doesCoverAllContent" boolean NOT NULL,
	"created_at" timestamp,
	"modified_on" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scriptural_rendering_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"rendering_id" serial NOT NULL,
	"book_slug" varchar(64) NOT NULL,
	"book_name" varchar NOT NULL,
	"chapter" integer NOT NULL,
	"sort" smallint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nonscriptural_rendering_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"rendering_id" serial NOT NULL,
	"name" varchar(256),
	"additional_data" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "world_region" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"created_on" timestamp,
	"modified_on" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "country" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"world_region_id" serial NOT NULL,
	"created_on" timestamp,
	"modified_on" timestamp,
	"alpha_2" varchar NOT NULL,
	"alpha_3" varchar,
	"population" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "country_to_language" (
	"language_ietf_code" varchar NOT NULL,
	"country_alpha_2" varchar NOT NULL,
	PRIMARY KEY("language_ietf_code","country_alpha_2")
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ietf_idx" ON "language" ("ietf_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repo_idx" ON "git_repo" ("username","repo_name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "type_idx" ON "file_type" ("file_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rendering_unique_idx" ON "rendering" ("url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "region_name_idx" ON "world_region" ("region");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alpha_2_idx" ON "country" ("alpha_2");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wa_language_meta" ADD CONSTRAINT "wa_language_meta_ietf_code_language_ietf_code_fk" FOREIGN KEY ("ietf_code") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "language_alternate_name" ADD CONSTRAINT "language_alternate_name_ietf_code_language_ietf_code_fk" FOREIGN KEY ("ietf_code") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "languages_to_languages" ADD CONSTRAINT "languages_to_languages_gateway_language_ietf_language_ietf_code_fk" FOREIGN KEY ("gateway_language_ietf") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "languages_to_languages" ADD CONSTRAINT "languages_to_languages_gateway_language_to_ietf_language_ietf_code_fk" FOREIGN KEY ("gateway_language_to_ietf") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content" ADD CONSTRAINT "content_language_id_language_ietf_code_fk" FOREIGN KEY ("language_id") REFERENCES "language"("ietf_code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wa_content_meta" ADD CONSTRAINT "wa_content_meta_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connected_content" ADD CONSTRAINT "connected_content_content_id_1_content_id_fk" FOREIGN KEY ("content_id_1") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connected_content" ADD CONSTRAINT "connected_content_content_id_2_content_id_fk" FOREIGN KEY ("content_id_2") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "git_repo" ADD CONSTRAINT "git_repo_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rendering" ADD CONSTRAINT "rendering_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rendering" ADD CONSTRAINT "rendering_file_type_id_file_type_id_fk" FOREIGN KEY ("file_type_id") REFERENCES "file_type"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scriptural_rendering_metadata" ADD CONSTRAINT "scriptural_rendering_metadata_rendering_id_rendering_id_fk" FOREIGN KEY ("rendering_id") REFERENCES "rendering"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nonscriptural_rendering_metadata" ADD CONSTRAINT "nonscriptural_rendering_metadata_rendering_id_rendering_id_fk" FOREIGN KEY ("rendering_id") REFERENCES "rendering"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "country" ADD CONSTRAINT "country_world_region_id_world_region_id_fk" FOREIGN KEY ("world_region_id") REFERENCES "world_region"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "country_to_language" ADD CONSTRAINT "country_to_language_language_ietf_code_language_ietf_code_fk" FOREIGN KEY ("language_ietf_code") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "country_to_language" ADD CONSTRAINT "country_to_language_country_alpha_2_country_alpha_2_fk" FOREIGN KEY ("country_alpha_2") REFERENCES "country"("alpha_2") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
