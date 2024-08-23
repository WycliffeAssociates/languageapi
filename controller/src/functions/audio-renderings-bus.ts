import {z} from "zod";
import {app, InvocationContext} from "@azure/functions";
import {checkContentExists, upsertContentFromRenderingBus} from "../utils";
import {createId} from "@paralleldrive/cuid2";
import * as validators from "../routes/validation";
import {handlePost as handleContentPost} from "../routes/content";
import {getDb as startDb} from "../db/config";
import * as schema from "../db/schema/schema";
import {eq, and, inArray} from "drizzle-orm";
import {handlePost as handleRenderingPost} from "../routes/rendering";
import {insertContent} from "../db/schema/validations";
import {contentDomainEnum} from "../db/schema/constants";

const db = startDb();

const numberInString = z.string().transform((val, ctx) => {
  const parsed = parseInt(val);
  if (isNaN(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Not a number",
    });

    // This is a special symbol you can use to
    // return early from the transform function.
    // It has type `never` so it does not affect the
    // inferred return type.
    return z.NEVER;
  }
  return parsed;
});

const audioMessageFileSchema = z.object({
  size: z.number(),
  url: z.string(),
  fileType: z.string().toLowerCase(),
  hash: z.string(),
  isWholeBook: z.boolean(),
  isWholeProject: z.boolean(),
  bookName: z.string(),
  bookSlug: z.string().toUpperCase(),
  chapter: numberInString,
});
const audioMessageSchema = z.object({
  languageIetf: z.string(),
  name: z.string().toLowerCase(),
  type: z.string(),
  domain: z.string(),
  resourceType: z.string(),
  resourceTitle: z.string().nullable().optional(),
  createdOn: z.string().optional(),
  modifiedOn: z.string().optional(),
  namespace: z.string().toLowerCase(),
  files: z.array(audioMessageFileSchema),
});

export async function audioRenderedContentListener(
  message: unknown,
  context: InvocationContext
) {
  console.log(
    `Processing audio message. Invocation id is ${context.invocationId}`
  );
  let contentCuid: string | null = null; //we need the guid of a content row to insert or upsert on the renderings Table.

  try {
    const parsed = audioMessageSchema.passthrough().parse(message);
    const {exists, id: currentExistingId} = await checkContentExists({
      name: parsed.name,
      namespace: parsed.namespace,
      db,
    });
    if (currentExistingId) {
      contentCuid = currentExistingId;
    }

    await db.transaction(async (tx) => {
      // prepare payload. Creating content also in transaction in case in fails to not orphan that content row
      // If this unique name/namespace for a piece of content does not exist, then creat it in the db:
      if (!exists) {
        parsed.createdOn = parsed.createdOn || new Date().toISOString();
        parsed.modifiedOn = parsed.modifiedOn || new Date().toISOString();
        contentCuid = await createContentRow({
          context,
          row: parsed,
        });
      } else {
        // port / wacs non currently tracking audio info, but we still want to upsert if something changes from batch to batch since this is currently only route for content audio and renderings
        await upsertContentFromRenderingBus({
          existingId: currentExistingId,
          payload: {
            // todo: if wacs becomes source of truth over port for some items, or tracks some stuff that port doesn,'t can add that here
            title: parsed.resourceTitle || null,
            modifiedOn: parsed.modifiedOn || new Date().toISOString(),
            resourceType: parsed.resourceType,
            languageId: parsed.languageIetf,
            name: parsed.name,
            namespace: parsed.namespace,
          },
          db,
        });
      }
      if (!contentCuid) {
        throw new Error(
          `Failed to find contentCuid for ${parsed.name}-${parsed.namespace}`
        );
      }

      // messages for audio can't always fit into a single message from the queue due to size constraints.  We can't make that assumption and just delete all the previous renderings as such, So, this operation is an upsert on the unique url for each rendering and its metadata. Migrating to a different cdn or somethign would likley mean scrubbing these row based on a url startsWith {oldCdnUrl}
      const renderedContentRowsAlreadyInDb = await db
        .select({
          renderedRowId: schema.rendering.id,
          url: schema.rendering.url,
          metadataId: schema.scripturalRenderingMetadata.id,
          createdAt: schema.rendering.createdAt,
        })
        .from(schema.rendering)
        .leftJoin(
          schema.scripturalRenderingMetadata,
          eq(
            schema.rendering.id,
            schema.scripturalRenderingMetadata.renderingId
          )
        )
        .where(
          and(
            eq(schema.rendering.contentId, contentCuid),
            // we only have a slice of the files from bus meesage, so we should filter this result based on the urls from parsed queue message: What this query returns will be mapped against queue messages for ids and then updated.  If there is something from queue that is not in db, it'll be inserted.
            inArray(
              schema.rendering.url,
              parsed.files.map((f) => f.url)
            )
          )
        );
      // grab existing ids from db for upserts;
      // Then create payload of rendered_row + meta for each retrieval.
      type returnedRowType = (typeof renderedContentRowsAlreadyInDb)[number];
      let renderedRowsLookup: Record<string, returnedRowType> = {};
      renderedContentRowsAlreadyInDb.forEach((row) => {
        // @ts-ignore.  Some types are wrong somewhere, cause this is become a date object when queried back out.
        if (row.createdAt instanceof Date) {
          row.createdAt = row.createdAt.toISOString();
        }
        renderedRowsLookup[row.url] = row;
      });

      // Prepare the rows to insert and upsert renderedContent and meta;
      const dbPayload: z.infer<typeof validators.renderingsPost> =
        parsed.files.map((file) => {
          // tempid used to tie together metadata to a rendering and maintain a key constraint. I.e when I post an array of renderings, We use this tempId to find inserted rendering row that corresponds to the metadata row, and then we can put that id to statisfy the key constraint.
          const tempId = createId();
          let payload: z.infer<typeof validators.renderingsPost.element> = {
            tempId: tempId,
            namespace: parsed.namespace,
            contentId: contentCuid!,
            fileType: file.fileType,
            url: file.url,
            fileSizeBytes: file.size,
            hash: file.hash,
            scripturalMeta: {
              isWholeBook: file.isWholeBook,
              isWholeProject: file.isWholeProject,
              bookName: file.bookName,
              bookSlug: file.bookSlug,
              chapter: file.chapter,
              tempId: tempId,
            },
          };
          if (renderedRowsLookup[file.url]) {
            const row = renderedRowsLookup[file.url];
            // Add the ids if we have them, for upserts, otherwise leave blank to auto create
            payload.createdAt = row.createdAt || new Date().toISOString();
            payload.id = row.renderedRowId;
            if (payload.scripturalMeta && row.metadataId) {
              payload.scripturalMeta.id = row.metadataId;
            }
          }
          return payload;
        });
      const postResult = await handleRenderingPost(dbPayload);
      if (postResult.status != 200) {
        tx.rollback();
        if (postResult.jsonBody) {
          if (postResult.jsonBody.additionalErrors) {
            const errMessage = JSON.stringify(
              `ADDITIONAL ERRORS: \n ${postResult.jsonBody.additionalErrors}\n\n
              LAST ERR:
              ${postResult.jsonBody.message}`
            );
            throw new Error(errMessage);
          } else {
            throw new Error(
              postResult.jsonBody.message || "failed to post for some reason"
            );
          }
        }
      }
    });
  } catch (error) {
    let sessionId =
      typeof message == "object" && !!message && "session_id" in message
        ? message.session_id
        : "unknown";
    context.error(
      `Error processing ${context.invocationId}.  Session_id was ${sessionId}`
    );
    context.error(error);
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        context.error(JSON.stringify(issue));
      });
    }
  }
}

type createContentRowArgs = {
  context: InvocationContext;
  row: z.infer<typeof audioMessageSchema>;
};
async function createContentRow({context, row}: createContentRowArgs) {
  context.log(
    `${row.namespace}-${row.name} is not already in api. Creating new row in table`
  );
  const cuid = createId();
  // type guard to keep enum clean
  const isValidDomain = (
    val: unknown
  ): val is (typeof contentDomainEnum.enumValues)[number] => {
    return contentDomainEnum.enumValues.includes(
      val as (typeof contentDomainEnum.enumValues)[number]
    );
  };

  const newContentPayload: insertContent = {
    id: cuid,
    name: row.name,
    namespace: row.namespace,
    type: "audio",
    domain: isValidDomain(row.domain) ? row.domain : null,
    languageId: row.languageIetf,
    resourceType: row.resourceType,
    createdOn: row.createdOn,
    modifiedOn: row.modifiedOn,
    title: row.resourceTitle ? row.resourceTitle : null,
  } as const;
  const newContentRow: z.infer<typeof validators.contentPost> = [
    newContentPayload,
  ];
  const newRowRes = await handleContentPost(newContentRow);
  if (newRowRes.status !== 200) {
    // Not catching here.  Failing to have an actual content row when we needed to create one is reason for top level throw to catch this.
    throw new Error(
      `Failed to create new content row for ${row.namespace}-${row.name} `
    );
  } else {
    return newContentPayload.id;
  }
}
console.log("booting up the listener for audio bible messages");
app.serviceBusTopic("waAudioRenderings", {
  connection: "BUS_CONN",
  topicName: "audiobiel",
  subscriptionName:
    process.env.NODE_ENV?.toUpperCase() == "DEV"
      ? "languageapi-localdev"
      : "languageapi",
  handler: audioRenderedContentListener,
  isSessionsEnabled: true,
});
