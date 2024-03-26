import {app, InvocationContext} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {z} from "zod";
import {
  handlePost as handleRenderingPost,
  handleDel,
} from "../routes/rendering";
import {handlePost as handleContentPost} from "../routes/content";
import * as validators from "../routes/validation";
import * as schema from "../db/schema/schema";
import {eq} from "drizzle-orm";

const db = startDb();

const renderedFileSchema = z.object({
  Path: z.string(),
  Size: z.number(),
  FileType: z.string(),
  Hash: z.string(),
  Chapter: z.number().nullable(),
  Book: z.string().nullable(),
  Slug: z.string().nullable(),
});

const titlesSchema = z.record(z.string().nullable());

const renderingsSchema = z.object({
  Successful: z.boolean(),
  Message: z.string().nullable(),
  User: z.string(),
  Repo: z.string(),
  RepoUrl: z.string().nullable(),
  LanguageCode: z.string().nullable(),
  LanguageName: z.string().nullable(),
  ResourceType: z.string(),
  RenderedAt: z.string(),
  RepoId: z.number(),
  RenderedFiles: z.array(renderedFileSchema),
  Titles: titlesSchema,
});

export async function wacsSbRenderingsApi(
  message: unknown,
  context: InvocationContext
) {
  // If zod or the db action below throws here, the message will end up in the dead letter queue.
  try {
    const successStatus = z.object({Successful: z.boolean()}).parse(message);
    const wasSuccessful = !!successStatus.Successful;
    if (!wasSuccessful) {
      context.warn(
        `RENDERINGS BUS RECEIVED: received message from bus that was not a successful render. NOOP.  ${JSON.stringify(
          message
        )}`
        //  noop at this point. can't do anything.
      );
      return;
    }
    const parsed = renderingsSchema.parse(message);
    const namespace = "wacs";
    const id = `${parsed.User}/${parsed.Repo}`.toLowerCase();
    context.log(
      `RENDERINGS BUS RECEIVED: received a message for ${parsed.User} for ${parsed.Repo} for ${parsed.ResourceType} type`
    );

    const doesExist = await checkContentExists(`${namespace}-${id}`);
    if (!doesExist) {
      context.log(
        `${namespace}-${id} is not already in api. Creating new row in table`
      );
      const newContentRow: z.infer<typeof validators.contentPost> = [
        {
          namespace: "wacs",
          id: `${parsed.User}/${parsed.Repo}`.toLowerCase(),
          type: "text",
        },
      ];
      const newRowRes = await handleContentPost(newContentRow);
      if (newRowRes.status !== 200) {
        context.log(
          `Failed to create new content row for ${`${parsed.User}/${parsed.Repo}`.toLowerCase()}`
        );
        throw new Error(
          `Failed to create new content row for ${`${parsed.User}/${parsed.Repo}`.toLowerCase()}`
        );
      }
    }

    // Delete all renderings connected to this repo/project/content row: When we transact this delete, it should cascade to meta tables as long as cascade is set in schema.
    const deletePayload: z.infer<typeof validators.renderingDelete> = {
      contentIds: [{namespace, id}],
    };

    const dbPayload: z.infer<typeof validators.renderingsPost> =
      parsed.RenderedFiles.map((payload) => {
        const randomUUid = crypto.randomUUID();
        let baseLoad: z.infer<typeof validators.contentRenderingWithMeta> = {
          tempId: randomUUid,
          namespace: "wacs",
          contentId: `${parsed.User}/${parsed.Repo}`,
          fileType: payload.FileType,
          url: payload.Path,
          fileSizeBytes: payload.Size || 0,
          hash: payload.Hash,
        };
        if (
          ["bible", "tn", "tq", "bc"].includes(
            parsed.ResourceType.toLowerCase()
          )
        ) {
          const bookName = parsed.Titles[payload.Book || ""];
          const isWholeBook = !payload.Chapter && !!payload.Book;
          let isWholeProject =
            !payload.Chapter &&
            !payload.Book &&
            ["download", "index", "whole"].includes(payload.Path);

          baseLoad.scripturalMeta = {
            tempId: randomUUid,
            bookName: bookName,
            chapter: payload.Chapter,
            isWholeBook,
            isWholeProject,
          };
          payload.Book && (baseLoad.scripturalMeta.bookSlug = payload.Book);
          bookName && (baseLoad.scripturalMeta.bookName = bookName);
        } else {
          baseLoad.nonScripturalMeta = {
            tempId: randomUUid,
            name: payload.Slug,
          };
          // noop for now.
          // but baseLoad.nonScripturalMeta would go here
        }
        return baseLoad;
      });
    // todo: becuase these are rendered over and over, we want to delete everything from the renderings and renderings meta tables for the given content id, and new meta (since blobs are replaced and not versioned out). Then we can post to the renderings and meta tables
    await db.transaction(async (tx) => {
      // Clear out all renderings and meta (cascade) for this wacs repo first since the pipeline recreates all blobs on a path on render.
      context.log(`Clearing prev renderings for ${parsed.User}/${parsed.Repo}`);
      const delResult = await handleDel(deletePayload);
      if (delResult.status != 200) {
        tx.rollback();
        if (delResult.jsonBody) {
          throw new Error(delResult.jsonBody.message || "failed to delete");
        }
      } else {
        // Insert new renderings and meta
        context.log(`Posting new renderings for ${parsed.User}/${parsed.Repo}`);
        const postResult = await handleRenderingPost(dbPayload);
        if (postResult.status != 200) {
          tx.rollback();
          if (postResult.jsonBody) {
            throw new Error(postResult.jsonBody.message || "failed to delete");
          }
        }
      }
    });
  } catch (error) {
    context.error(`Error processing ${JSON.stringify(message)}`);
    context.error(error);
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        context.error(JSON.stringify(issue));
      });
    }
  }
}

export async function checkContentExists(id: string) {
  const doesExist = await db
    .select({id: schema.content.id})
    .from(schema.content)
    .where(eq(schema.content.id, id));
  return doesExist.length > 0;
}
console.log("booting up the renderings bus listener");
app.serviceBusTopic("waLangApiRenderings", {
  connection: "BUS_CONN",
  topicName: "reporendered",
  subscriptionName: "reporendered-languageapi",
  handler: wacsSbRenderingsApi,
});
