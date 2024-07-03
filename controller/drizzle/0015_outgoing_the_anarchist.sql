
-- REMOVE OLD CONSTRAINTS
ALTER TABLE "languages_to_languages" DROP CONSTRAINT "languages_to_languages_gateway_language_ietf_language_ietf_code";
--> statement-breakpoint

ALTER TABLE "languages_to_languages" DROP CONSTRAINT "languages_to_languages_gateway_language_to_ietf_language_ietf_c";
--> statement-breakpoint

-- ALTER TABLE "languages_to_languages" DROP CONSTRAINT "languages_to_languages_gateway_language_ietf_gateway_language_t";
--> statement-breakpoint

-- ALTER TABLE "connected_content" DROP CONSTRAINT "connected_content_content_id_1_content_id_2";--> statement-breakpoint
-- ALTER TABLE "country_to_language" DROP CONSTRAINT "country_to_language_language_ietf_code_country_alpha_2";
--> statement-breakpoint
ALTER TABLE "connected_content" ADD CONSTRAINT "connected_content_pkey" PRIMARY KEY("content_id_1","content_id_2");--> statement-breakpoint
ALTER TABLE "country_to_language" ADD CONSTRAINT "country_to_language_pkey" PRIMARY KEY("language_ietf_code","country_alpha_2");--> statement-breakpoint


-- RENAME TABLE
ALTER TABLE IF EXISTS "languages_to_languages" RENAME TO "gateway_language_to_dependent_language";
--> statement-breakpoint

-- RENAME COLUMN
ALTER TABLE "gateway_language_to_dependent_language" RENAME COLUMN "gateway_language_to_ietf" TO "dependent_language_ietf";
--> statement-breakpoint





-- ADD NEW CONSTRAINTS
-- primary
ALTER TABLE "gateway_language_to_dependent_language" ADD CONSTRAINT "gateway_dependent_pkey" PRIMARY KEY("gateway_language_ietf","dependent_language_ietf");
--> statement-breakpoint

-- foreign
DO $$ BEGIN
 ALTER TABLE "gateway_language_to_dependent_language" ADD CONSTRAINT "gl_glietf_language_ietf_code_fk" FOREIGN KEY ("gateway_language_ietf") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- foreign
DO $$ BEGIN
 ALTER TABLE "gateway_language_to_dependent_language" ADD CONSTRAINT "gl_dependent_ietf_language_ietf_code_fk" FOREIGN KEY ("dependent_language_ietf") REFERENCES "language"("ietf_code") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
