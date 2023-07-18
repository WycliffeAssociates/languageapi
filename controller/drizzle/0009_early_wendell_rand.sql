ALTER TABLE "scriptural_rendering_metadata" DROP CONSTRAINT "scriptural_rendering_metadata_rendering_id_rendering_id_fk";
--> statement-breakpoint
ALTER TABLE "nonscriptural_rendering_metadata" DROP CONSTRAINT "nonscriptural_rendering_metadata_rendering_id_rendering_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scriptural_rendering_metadata" ADD CONSTRAINT "scriptural_rendering_metadata_rendering_id_rendering_id_fk" FOREIGN KEY ("rendering_id") REFERENCES "rendering"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nonscriptural_rendering_metadata" ADD CONSTRAINT "nonscriptural_rendering_metadata_rendering_id_rendering_id_fk" FOREIGN KEY ("rendering_id") REFERENCES "rendering"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
