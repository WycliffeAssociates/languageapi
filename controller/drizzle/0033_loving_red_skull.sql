CREATE TABLE "git_topic" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	CONSTRAINT "git_topic_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "repo_topic" (
	"repo_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	CONSTRAINT "repo_topic_repo_id_topic_id_pk" PRIMARY KEY("repo_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "repo_topic" ADD CONSTRAINT "repo_topic_repo_id_git_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."git_repo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_topic" ADD CONSTRAINT "repo_topic_topic_id_git_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."git_topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topic_name_idx" ON "git_topic" USING btree ("name");--> statement-breakpoint
CREATE INDEX "topic_idx" ON "repo_topic" USING btree ("topic_id");