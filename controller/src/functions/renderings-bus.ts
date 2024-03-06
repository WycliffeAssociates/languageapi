import {app, InvocationContext} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {z} from "zod";
import {
  handlePost as handleRenderingPost,
  handleDel,
} from "../routes/rendering";
import * as validators from "../routes/validation";

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

const titlesSchema = z.record(z.string());

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
    const parsed = renderingsSchema.parse(message);
    context.log(
      `received a message for ${parsed.User} for ${parsed.Repo} for ${parsed.ResourceType} type`
    );

    // Delete all renderings connected to this repo/project/content row: When we transact this delete, it should cascade to meta tables as long as cascade is set in schema.
    const deletePayload: z.infer<typeof validators.renderingDelete> = {
      contentIds: [{namespace: "wacs", id: `${parsed.User}/${parsed.Repo}`}],
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
      const delResult = await handleDel(deletePayload);
      if (delResult.status != 200) {
        tx.rollback();
        if (delResult.jsonBody) {
          throw new Error(delResult.jsonBody.message || "failed to delete");
        }
      } else {
        // Insert new renderings and meta
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
    context.error(error);
  }
}

console.log("booting up the renderings bus listener");
app.serviceBusTopic("waLangApiRenderings", {
  connection: "BUS_CONN",
  topicName: "reporendered",
  subscriptionName: "reporendered-languageapi",
  handler: wacsSbRenderingsApi,
});
