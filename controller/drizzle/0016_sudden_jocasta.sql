ALTER TABLE "scriptural_rendering_metadata" ALTER COLUMN "book_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scriptural_rendering_metadata" ALTER COLUMN "chapter" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scriptural_rendering_metadata" ADD COLUMN "is_whole_chapter" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "scriptural_rendering_metadata" ADD COLUMN "is_whole_book" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "scriptural_rendering_metadata" ADD COLUMN "is_whole_project" boolean NOT NULL;