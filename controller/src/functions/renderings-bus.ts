import {app, InvocationContext} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {z} from "zod";
import {
  handlePost as handleRenderingPost,
  handleDel,
} from "../routes/rendering";
<<<<<<< HEAD
import {handlePost as handleContentPost} from "../routes/content";
import * as validators from "../routes/validation";
import * as schema from "../db/schema/schema";
import {and, eq} from "drizzle-orm";
import {createId} from "@paralleldrive/cuid2";
=======
import * as validators from "../routes/validation";
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)

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

<<<<<<< HEAD
const titlesSchema = z.record(z.string().nullable());
=======
const titlesSchema = z.record(z.string());
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)

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
<<<<<<< HEAD
  const namespace = "wacs";
  let contentCuid: string | null = null; //we need the guid of a content row to insert or upsert on the renderings Table.

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
    const id = `${parsed.User}/${parsed.Repo}`.toLowerCase();
    context.log(
      `RENDERINGS BUS RECEIVED: received a message for ${parsed.User} for ${parsed.Repo} for ${parsed.ResourceType} type`
    );

    const {exists, id: currentExistingId} = await checkContentExists({
      name: id,
      namespace,
    });
    if (currentExistingId) contentCuid = currentExistingId;
    if (!exists) {
      context.log(
        `${namespace}-${id} is not already in api. Creating new row in table`
      );
      const cuid = createId();
      contentCuid = cuid;
      const newContentPayload = {
        id: cuid,
        name: `${parsed.User}/${parsed.Repo}`.toLowerCase(),
        namespace: namespace,
        type: "text",
      } as const;
      const newContentRow: z.infer<typeof validators.contentPost> = [
        newContentPayload,
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

    if (!contentCuid) {
      throw new Error(`Failed to find contentCuid for ${id}`);
    }

    // Delete all renderings connected to this repo/project/content row: When we transact this delete, it should cascade to meta tables as long as cascade is set in schema.
    const deletePayload: z.infer<typeof validators.renderingDelete> = {
      contentIds: [contentCuid],
=======
  // If zod or the db action below throws here, the message will end up in the dead letter queue.
  try {
    const parsed = renderingsSchema.parse(message);
    context.log(
      `received a message for ${parsed.User} for ${parsed.Repo} for ${parsed.ResourceType} type`
    );

    // Delete all renderings connected to this repo/project/content row: When we transact this delete, it should cascade to meta tables as long as cascade is set in schema.
    const deletePayload: z.infer<typeof validators.renderingDelete> = {
      contentIds: [{namespace: "wacs", id: `${parsed.User}/${parsed.Repo}`}],
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)
    };

    const dbPayload: z.infer<typeof validators.renderingsPost> =
      parsed.RenderedFiles.map((payload) => {
<<<<<<< HEAD
        // Used to tie together metadata to rendering
        const randomUUid = createId();
        let baseLoad: z.infer<typeof validators.contentRenderingWithMeta> = {
          tempId: randomUUid,
          namespace,
          contentId: contentCuid!,
=======
        const randomUUid = crypto.randomUUID();
        let baseLoad: z.infer<typeof validators.contentRenderingWithMeta> = {
          tempId: randomUUid,
          namespace: "wacs",
          contentId: `${parsed.User}/${parsed.Repo}`,
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)
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
<<<<<<< HEAD
    await db.transaction(async (tx) => {
      // Clear out all renderings and meta (cascade) for this wacs repo first since the pipeline recreates all blobs on a path on render.
      context.log(`Clearing prev renderings for ${parsed.User}/${parsed.Repo}`);
=======

    await db.transaction(async (tx) => {
      // Clear out all renderings and meta (cascade) for this wacs repo first since the pipeline recreates all blobs on a path on render.
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)
      const delResult = await handleDel(deletePayload);
      if (delResult.status != 200) {
        tx.rollback();
        if (delResult.jsonBody) {
          throw new Error(delResult.jsonBody.message || "failed to delete");
        }
      } else {
        // Insert new renderings and meta
<<<<<<< HEAD
        context.log(`Posting new renderings for ${parsed.User}/${parsed.Repo}`);
=======
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)
        const postResult = await handleRenderingPost(dbPayload);
        if (postResult.status != 200) {
          tx.rollback();
          if (postResult.jsonBody) {
<<<<<<< HEAD
            if (postResult.jsonBody.additionalErrors) {
              const errMessage = JSON.stringify(
                `ADDITIONAL ERRORS: \n ${postResult.jsonBody.additionalErrors}\n\n 
                LAST ERR: 
                ${postResult.jsonBody.message}`
              );
              throw new Error(errMessage);
            } else {
              throw new Error(
                postResult.jsonBody.message || "failed to delete"
              );
            }
=======
            throw new Error(postResult.jsonBody.message || "failed to delete");
>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)
          }
        }
      }
    });
  } catch (error) {
<<<<<<< HEAD
    context.error(`Error processing ${JSON.stringify(message)}`);
    context.error(error);
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        context.error(JSON.stringify(issue));
      });
    }
  }
}

export async function checkContentExists({
  name,
  namespace,
}: {
  name: string;
  namespace: string;
}) {
  const doesExist = await db
    .select({id: schema.content.id})
    .from(schema.content)
    .where(
      and(
        eq(schema.content.namespace, namespace),
        eq(schema.content.name, name)
      )
    );

  let dbId = doesExist[0]?.id ?? null;

  return {exists: doesExist.length > 0, id: dbId};
}
=======
    context.error(error);
  }
}

>>>>>>> 90cec3e (add renderings table.  Move gateway to walangmeta. Rename some properties)
console.log("booting up the renderings bus listener");
app.serviceBusTopic("waLangApiRenderings", {
  connection: "BUS_CONN",
  topicName: "reporendered",
  subscriptionName: "reporendered-languageapi",
  handler: wacsSbRenderingsApi,
});
