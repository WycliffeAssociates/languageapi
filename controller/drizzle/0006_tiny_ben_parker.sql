DROP INDEX IF EXISTS "repo_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "username_reponame_idx" ON "git_repo" ("username","repo_name");