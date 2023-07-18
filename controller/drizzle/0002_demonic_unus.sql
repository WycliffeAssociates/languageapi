ALTER TABLE "content" ALTER COLUMN "language_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "language" ADD COLUMN "id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "language" ADD COLUMN "home_country_id" serial NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "language" ADD CONSTRAINT "language_home_country_id_country_id_fk" FOREIGN KEY ("home_country_id") REFERENCES "country"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
