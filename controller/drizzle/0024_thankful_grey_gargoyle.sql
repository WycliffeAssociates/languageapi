ALTER TABLE "content" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "content" ALTER COLUMN "namespace" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "name_nampespace_idx" ON "content" ("name","namespace");