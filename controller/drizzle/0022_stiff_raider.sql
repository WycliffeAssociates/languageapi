CREATE TABLE IF NOT EXISTS "localization" (
	"ietf_code" varchar NOT NULL,
	"key" varchar NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "localization_pkey" PRIMARY KEY("ietf_code","key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "localization" ADD CONSTRAINT "localization_ietf_code_language_ietf_code_fk" FOREIGN KEY ("ietf_code") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
