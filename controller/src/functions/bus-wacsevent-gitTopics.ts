import {app, InvocationContext} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {z} from "zod";
import {checkContentExists} from "../utils";
import * as dbSchema from "../db/schema/schema";
import {and, eq, inArray} from "drizzle-orm";

const db = startDb();

const wacMessageSchema = z.object({
  EventType: z.string(),
  RepoHtmlUrl: z.string(),
  Repo: z.string(),
  User: z.string(),
  RepoId: z.number(),
  DefaultBranch: z.string(),
  Topics: z.array(z.string()),
});

export async function wacsSbGitTopicsApi(
  message: unknown,
  context: InvocationContext
) {
  const namespace = "wacs";
  let contentCuid: string | null = null; //we need the guid of a content row to insert or upsert on the topics table and pivot table

  try {
    const parsed = wacMessageSchema.parse(message);
    const joinedName = `${parsed.User}/${parsed.Repo}`.toLowerCase();
    context.log(
      `RENDERINGS BUS RECEIVED: received a message for ${parsed.User} for ${parsed.Repo}.`
    );
    const {exists, id: currentExistingId} = await checkContentExists({
      name: joinedName,
      namespace,
      db,
    });
    if (!exists) {
      // return; this route is only for upserting topics, not creating new content
      return;
    }
    if (currentExistingId) {
      contentCuid = currentExistingId;
    }
    if (!contentCuid) return;
    await db.transaction(async (tx) => {
      if (!contentCuid) return;

      // 1) Get repo row
      const repo = await tx.query.gitRepo.findFirst({
        where: eq(dbSchema.gitRepo.contentId, contentCuid),
      });
      if (!repo) return;

      const repoId = repo.id;

      // 2) Existing topics for repo (pivot)
      const existing = await tx
        .select({
          topicId: dbSchema.repoToTopic.topicId,
          name: dbSchema.gitTopic.name,
        })
        .from(dbSchema.repoToTopic)
        .innerJoin(
          dbSchema.gitTopic,
          eq(dbSchema.repoToTopic.topicId, dbSchema.gitTopic.id)
        )
        .where(eq(dbSchema.repoToTopic.repoId, repoId));

      const existingNames = new Set(existing.map((t) => t.name));
      const incomingNames = new Set(parsed.Topics.map((t) => t.toLowerCase()));

      // 3) Determine adds + deletes
      const toAdd = [...incomingNames].filter((n) => !existingNames.has(n));
      const toRemove = [...existingNames].filter((n) => !incomingNames.has(n));

      // 4) Add or ensure topic rows, then ensure pivot rows
      for (const name of toAdd) {
        // upsert topic
        const [topic] = await tx
          .insert(dbSchema.gitTopic)
          .values({name})
          .onConflictDoNothing()
          .returning();

        const topicId =
          topic?.id ??
          (
            await tx.query.gitTopic.findFirst({
              where: eq(dbSchema.gitTopic.name, name),
            })
          )?.id;

        if (!topicId) continue;

        await tx
          .insert(dbSchema.repoToTopic)
          .values({repoId, topicId})
          .onConflictDoNothing();
      }

      // 5) Remove stale pivot entries
      if (toRemove.length > 0) {
        const toRemoveIds = existing
          .filter((t) => toRemove.includes(t.name))
          .map((t) => t.topicId);

        if (toRemoveIds.length > 0) {
          await tx
            .delete(dbSchema.repoToTopic)
            .where(
              and(
                eq(dbSchema.repoToTopic.repoId, repoId),
                inArray(dbSchema.repoToTopic.topicId, toRemoveIds)
              )
            );
        }
      }
    });
  } catch (error) {
    console.error(error);
    return;
  }
}

app.serviceBusTopic("waLangApiGitTopics", {
  connection: "BUS_CONN",
  topicName: "wacsevent",
  subscriptionName:
    process.env.NODE_ENV?.toUpperCase() == "DEV"
      ? "will-local-wacsevent"
      : "languageapi",
  handler: wacsSbGitTopicsApi,
});
