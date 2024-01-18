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
  LanguageCode: z.string().nullable(),
  LanguageName: z.string().nullable(),
  ResourceCode: z.string().nullable(),
  LatestCommit: latestCommitSchema.optional().nullable(),
  RepoId: z.number(),
  Action: z.string().nullable(),
});

export async function wacsSbLangApi(
  message: unknown,
  context: InvocationContext
) {
  // If zod or the db action below throws here, the message will end up in the dead letter queue.
  const parsed = eventSchema.parse(message);

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
}

// todo: I think I'm done here. Just clean up the docker cruft I have left behind, and change to a feature branch, adn pr tag dan and craig to have a look.  Just look through all your staged files first.  Double check on env vars with dan as well. (adjust them in docker). Leave some notes about the hybrd dev appraoch in teh readme (docker for hasura and postgres, run the func locally though).
app.serviceBusTopic("waLangApi", {
  connection: "BUS_CONN",
  topicName: "wacsevent",
  subscriptionName: "languageapi",
  handler: wacsSbLangApi,
});
