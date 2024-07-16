ALTER TABLE "content" DROP CONSTRAINT "content_language_id_language_ietf_code_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content" ADD CONSTRAINT "content_language_id_language_ietf_code_fk" FOREIGN KEY ("language_id") REFERENCES "language"("ietf_code") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
