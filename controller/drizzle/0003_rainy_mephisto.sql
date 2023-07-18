ALTER TABLE "rendering" DROP CONSTRAINT "rendering_file_type_id_file_type_id_fk";
--> statement-breakpoint
DROP TABLE "file_type";
--> statement-breakpoint
ALTER TABLE "rendering" ADD COLUMN "file_type" varchar NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_idx" ON "wa_content_meta" ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_id_idx" ON "git_repo" ("content_id");--> statement-breakpoint
ALTER TABLE "rendering" DROP COLUMN IF EXISTS "file_type_id";