import {z} from "zod";
import {app, InvocationContext} from "@azure/functions";
import {checkContentExists} from "../utils";
import {createId} from "@paralleldrive/cuid2";
import * as validators from "../routes/validation";
import {handlePost as handleContentPost} from "../routes/content";
import {getDb as startDb} from "../db/config";
import * as schema from "../db/schema/schema";
import {eq, and, inArray} from "drizzle-orm";
import {handlePost as handleRenderingPost} from "../routes/rendering";
import {insertContent} from "../db/schema/validations";

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
  createdOn: z.string().optional(), //todo check
  modifiedOn: z.string().optional(), //todo check
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
      }
      if (!contentCuid) {
        throw new Error(
          `Failed to find contentCuid for ${parsed.name}-${parsed.namespace}`
        );
      }

      // messages for audio can't always fit into a single repo + all it's files since there are 3k plus files for each Bible due to mp3, cue, wav, etc for each chapter.So, we'll need to upsert on the url for each row in rendered_content table.
      // But what about metadata row? But if I just insert the metadata row, there could be duplicates. Probably just best to query all rendered_content rows for a given contentId.  Merge in any existing IDs from db, and then ovveride the rest of the properties with what's given.
      const renderedContentRowsAlreadyInDb = await db
        .select({
          renderedRowId: schema.rendering.id,
          url: schema.rendering.url,
          metadataId: schema.scripturalRenderingMetadata.id,
          createdAt: schema.rendering.createdAt,
        })
        .from(schema.rendering)
        .leftJoin(
          // metadata and rendered_row are 1-1;
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
      // queue messages are ones to process, but we'll grab id's from db on existing for upserts;
      // Create a set of rendered_row + meta for each retrieval.
      // renderedRowsWithMetaSet
      type returnedRowType = (typeof renderedContentRowsAlreadyInDb)[number];
      let renderedRowsLookup: Record<string, returnedRowType> = {};
      renderedContentRowsAlreadyInDb.forEach((row) => {
        // @ts-ignore.  Some types are wrong somewhere, cause this is become a day when queried back out.
        if (row.createdAt instanceof Date) {
          row.createdAt = row.createdAt.toISOString();
        }
        renderedRowsLookup[row.url] = row;
      });

      // Prepare the rows to insert and upsert renderedContent and meta;
      const dbPayload: z.infer<typeof validators.renderingsPost> =
        parsed.files.map((file) => {
          // used to tie together metadata to a rendering and maintain a key constraint.
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
            // Add the ids if we have them, for upserts, otherwise leave blank to auto create
            payload.createdAt =
              renderedRowsLookup[file.url].createdAt ||
              new Date().toISOString();
            payload.id = renderedRowsLookup[file.url].renderedRowId;
            //@ts-ignore. I gave the type above for autocomplate and warnings, but meta is there above.
            payload.scripturalMeta.id = renderedRowsLookup[file.url].metadataId;
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
    // @ts-ignore
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
  const newContentPayload: insertContent = {
    id: cuid,
    name: row.name,
    namespace: row.namespace,
    type: "audio",
    // @ts-ignore. All are scritpure hardcoded for now, gonna leave the hard code on the message sender side
    domain: row.domain,
    languageId: row.languageIetf,
    resourceType: row.resourceType,
    createdOn: row.createdOn,
    modifiedOn: row.modifiedOn,
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
  isSessionsEnabled:
    // todo: make local dev session enabled too with dan
    process.env.NODE_ENV?.toUpperCase() == "DEV" ? false : true,
});
