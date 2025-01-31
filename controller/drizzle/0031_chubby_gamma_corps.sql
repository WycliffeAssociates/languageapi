DROP INDEX "scriptural_metadata_rendering_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "scriptural_metadata_rendering_idx" ON "scriptural_rendering_metadata" USING btree ("rendering_id");