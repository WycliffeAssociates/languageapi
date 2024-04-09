CREATE TABLE IF NOT EXISTS "localization" (
	"ietf_code" varchar NOT NULL,
	"key" varchar NOT NULL,
	"category" varchar NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "localization_pkey" PRIMARY KEY("ietf_code","key","category")
);
--> statement-breakpoint
ALTER TABLE "rendering" RENAME TO "rendered_content";--> statement-breakpoint
ALTER TABLE "wa_content_meta" RENAME TO "wa_content_metadata";--> statement-breakpoint
ALTER TABLE "wa_language_meta" RENAME TO "wa_language_metadata";--> statement-breakpoint
ALTER TABLE "scriptural_rendering_metadata" DROP CONSTRAINT "scriptural_rendering_metadata_rendering_id_rendering_id_fk";
--> statement-breakpoint
ALTER TABLE "nonscriptural_rendering_metadata" DROP CONSTRAINT "nonscriptural_rendering_metadata_rendering_id_rendering_id_fk";
--> statement-breakpoint
ALTER TABLE "rendered_content" DROP CONSTRAINT "rendering_content_id_content_id_fk";
--> statement-breakpoint
ALTER TABLE "wa_content_metadata" DROP CONSTRAINT "wa_content_meta_content_id_content_id_fk";
--> statement-breakpoint
ALTER TABLE "wa_language_metadata" DROP CONSTRAINT "wa_language_meta_ietf_code_language_ietf_code_fk";
--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "namespace" varchar(256);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scriptural_rendering_metadata" ADD CONSTRAINT "rendering_fk" FOREIGN KEY ("rendering_id") REFERENCES "rendered_content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nonscriptural_rendering_metadata" ADD CONSTRAINT "nonscriptural_meta_rendering_fk" FOREIGN KEY ("rendering_id") REFERENCES "rendered_content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rendered_content" ADD CONSTRAINT "rendered_content_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wa_content_metadata" ADD CONSTRAINT "wa_content_metadata_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wa_language_metadata" ADD CONSTRAINT "metadata_language_fk" FOREIGN KEY ("ietf_code") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN IF EXISTS "git_id";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "localization" ADD CONSTRAINT "localization_ietf_code_language_ietf_code_fk" FOREIGN KEY ("ietf_code") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
