import {app, InvocationContext} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {z} from "zod";
import {handlePost as handleGitPost} from "../routes/git";
import * as validators from "../routes/validation";
startDb();

const latestCommitSchema = z.object({
  Hash: z.string(),
  Message: z.string(),
  Url: z.string(),
  Username: z.string(),
  Timestamp: z.string(),
});
const eventSchema = z.object({
  // EventType: z.enum(["push", "fork", "repository"]),
  EventType: z.string(),
  RepoHtmlUrl: z.string(),
  User: z.string(),
  Repo: z.string(),
  LanguageCode: z.string().optional().nullable(),
  LanguageName: z.string().optional().nullable(),
  ResourceCode: z.string().optional().nullable(),
  LatestCommit: latestCommitSchema.optional().nullable(),
  RepoId: z.number(),
  Action: z.string().nullable(),
});

export async function wacsSbLangApi(
  message: unknown,
  context: InvocationContext
) {
  // If zod or the db action below throws here, the message will end up in the dead letter queue.
  try {
    context.log(message);
    const parsed = eventSchema.parse(message);
    context.log(
      `received a message for ${parsed.Repo} of event type ${parsed.EventType}`
    );

    // api built with bulk ops in mind, so arrays are passed, even for single op, versus having insertSingle vs insertMany type routes
    const shapedForDb: z.infer<typeof validators.gitPost> = [
      {
        namespace: "wacs",
        contentId: `${parsed.User}/${parsed.Repo}`,
        repoName: parsed.Repo,
        repoUrl: parsed.RepoHtmlUrl,
        username: parsed.User,
      },
    ];

    if (
      parsed.EventType == "forked" ||
      parsed.EventType == "push" ||
      parsed.EventType == "repository"
    ) {
      const result = await handleGitPost(shapedForDb);
      if (result.status != 200) {
        throw new Error(
          `Could not update git information in DB for ${`${parsed.User}/${parsed.Repo}`}`
        );
      }
    } else {
      context.log("Updated table successfully");
    }
  } catch (error) {
    context.error(error);
  }
}

console.log("booting up the bus listener");
app.serviceBusTopic("waLangApi", {
  connection: "BUS_CONN",
  topicName: "wacsevent",
  subscriptionName: "languageapi",
  handler: wacsSbLangApi,
});
