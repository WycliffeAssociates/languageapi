ALTER TABLE "language" DROP CONSTRAINT "language_home_country_id_country_id_fk";
--> statement-breakpoint
ALTER TABLE "language" ADD COLUMN "home_country_alpha2" varchar NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "language" ADD CONSTRAINT "language_home_country_alpha2_country_alpha_2_fk" FOREIGN KEY ("home_country_alpha2") REFERENCES "country"("alpha_2") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "language" DROP COLUMN IF EXISTS "home_country_id";