DROP INDEX IF EXISTS "rendering_unique_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "language_idx" ON "content" ("language_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "username_idx" ON "git_repo" ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nonscriptural_metadata_rendering_idx" ON "nonscriptural_rendering_metadata" ("rendering_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "render_content_id_idx" ON "rendered_content" ("content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_type_idx" ON "rendered_content" ("file_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scriptural_metadata_rendering_idx" ON "scriptural_rendering_metadata" ("rendering_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "show_biel_idx" ON "wa_content_metadata" ("show_on_biel");