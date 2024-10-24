import {app, InvocationContext} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {z} from "zod";
import {handlePost as handleRenderingPost} from "../routes/rendering";
import {handlePost as handleContentPost} from "../routes/content";
import {handlePost as handleGitPost} from "../routes/git";
import * as validators from "../routes/validation";
import {createId} from "@paralleldrive/cuid2";
import {
  checkContentExists,
  determineResourceType,
  upsertContentFromRenderingBus,
} from "../utils";
import {getExistingRenderedContentRows} from "../lib/shared";

const db = startDb();

const renderedFileSchema = z.object({
  Path: z.string().transform((val, ctx) => {
    if (!val.startsWith("/")) {
      val = `/${val}`;
    }
    return val;
  }),
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
  RepoUrl: z.string(),
  ResourceName: z.string().nullable().optional(),
  LanguageCode: z.string().nullable(),
  LanguageName: z.string().nullable(),
  ResourceType: z.string(),
  RenderedAt: z.string(),
  RepoId: z.number(),
  RenderedFiles: z.array(renderedFileSchema),
  FileBasePath: z.string().transform((val, ctx) => {
    if (val.endsWith("/")) {
      val.slice(0, -1);
    }
    return val;
  }),
  Titles: titlesSchema,
});

export async function wacsSbRenderingsApi(
  message: unknown,
  context: InvocationContext
) {
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
    const joinedName = `${parsed.User}/${parsed.Repo}`.toLowerCase();
    context.log(
      `RENDERINGS BUS RECEIVED: received a message for ${parsed.User} for ${parsed.Repo} for ${parsed.ResourceType} type`
    );

    const {exists, id: currentExistingId} = await checkContentExists({
      name: joinedName,
      namespace,
      db,
    });
    if (currentExistingId) contentCuid = currentExistingId;
    await db.transaction(async (tx) => {
      // CREATE CONTENT if content cuid not existing
      if (!exists) {
        context.log(
          `${joinedName}} is not already in api. Creating new row in table`
        );
        const cuid = createId();
        contentCuid = cuid;
        const newContentPayload: z.infer<
          typeof validators.contentPost.element
        > = {
          id: cuid,
          name: joinedName,
          namespace: namespace,
          type: "text",
          createdOn: new Date().toISOString(),
          modifiedOn: new Date().toISOString(),
        };
        if (parsed.LanguageCode) {
          newContentPayload.languageId = parsed.LanguageCode;
        }
        if (parsed.ResourceType) {
          newContentPayload.resourceType = parsed.ResourceType;
        }
        if (parsed.ResourceType) {
          newContentPayload.domain = determineResourceType(parsed.ResourceType);
        }
        if (parsed.ResourceName) {
          newContentPayload.title = parsed.ResourceName;
        }

        const newContentRow: z.infer<typeof validators.contentPost> = [
          newContentPayload,
        ];
        const newRowRes = await handleContentPost(newContentRow);
        if (newRowRes.status !== 200) {
          context.log(
            `Failed to create new content row for ${`${parsed.User}/${parsed.Repo}`.toLowerCase()}`
          );
          tx.rollback();
          throw new Error(
            `Failed to create new content row for ${`${parsed.User}/${parsed.Repo}`.toLowerCase()}`
          );
        }
      } else {
        // some properties we want to upsert on becuase PORT does not track them, such as the title, so if they've changed coming from the renderings bus, we need to upsert them.
        console.log(`upserting for ${joinedName}`);
        await upsertContentFromRenderingBus({
          existingId: currentExistingId,
          payload: {
            // as needed: if wacs becomes source of truth over port for some items, or tracks some stuff that port doesn,'t can add that here
            title: parsed.ResourceName || null,
          },
          handle: tx,
        });
      }
      // if !exists, created in prev step of making new content row. If it failed somehow, throw.
      if (!contentCuid) {
        throw new Error(`Failed to find contentCuid for ${joinedName}`);
      }

      // we got a repoRendered from gitea, so create a git row while we are it. go ahead and upsert in case the repoName or username or something changed
      // todo: see if arq will upsert on rerendering? one of those
      const newGitRow: z.infer<typeof validators.gitPost> = [
        {
          contentId: contentCuid,
          repoName: parsed.Repo,
          repoUrl: parsed.RepoUrl,
          username: parsed.User,
        },
      ];
      const gitResult = await handleGitPost(newGitRow);
      if (gitResult.status !== 200) {
        context.error(
          `Failed to create new git row for ${`${parsed.User}/${parsed.Repo}`.toLowerCase()}`
        );
        tx.rollback();
      }

      // ========================================
      // Note: query what's already in DB to perform upserts on the existing content given the URL's of this payload. If we end up in a spot with URls that should apply anymore, it'll be a `delete where url startsWith` sort of sql scrub. This upserts on any existing rendered_content, and the meta tables

      const renderedContentRowsAlreadyInDb =
        await getExistingRenderedContentRows({
          contentCuid,
          urlArray: parsed.RenderedFiles.map(
            (payload) => `${parsed.FileBasePath}${payload.Path}`
          ),
        });

      const renderedContentPayload: z.infer<typeof validators.renderingsPost> =
        parsed.RenderedFiles.map((payload) => {
          // Used to tie together metadata to rendering
          const randomUUid = createId();
          let baseLoad: z.infer<typeof validators.contentRenderingWithMeta> = {
            tempId: randomUUid,
            contentId: contentCuid!,
            namespace,
            fileType: payload.FileType,
            // zod handles the / separatore. Base Path should end with
            url: `${parsed.FileBasePath}${payload.Path}`,
            fileSizeBytes: payload.Size || 0,
            hash: payload.Hash,
          };
          const domain = determineResourceType(parsed.ResourceType);
          if (
            !!domain &&
            ["scripture", "gloss", "parascriptural"].includes(domain)
          ) {
            const bookName = parsed.Titles[payload.Book || ""];
            const isWholeBook = !payload.Chapter && !!payload.Book;
            let isWholeProject =
              !payload.Chapter &&
              !payload.Book &&
              ["download", "index", "whole", "print_all"].includes(
                payload.Path.toLowerCase()
              );

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
          const matchingFromLookup = renderedContentRowsAlreadyInDb.find(
            (row) => row.url === `${parsed.FileBasePath}${payload.Path}`
          );
          if (matchingFromLookup) {
            // Add the ids from existing lookup if we have them for rendered_content, and both meta tables, for upserts, otherwise leave blank to auto create.  If the rows exist, the content_id foreign keys will just propogate on due to no conflict.
            baseLoad.id = matchingFromLookup.renderedRowId;
            baseLoad.modifiedOn = new Date().toISOString();
            if (!!baseLoad.scripturalMeta && matchingFromLookup.metadataId) {
              baseLoad.scripturalMeta.id = matchingFromLookup.metadataId;
            }
            if (
              !!baseLoad.nonScripturalMeta &&
              matchingFromLookup.nonScripturalMetadataId
            ) {
              baseLoad.nonScripturalMeta.id =
                matchingFromLookup.nonScripturalMetadataId;
            }
          }
          return baseLoad;
        });

      // Insert new renderings and meta
      context.log(`Posting new renderings for ${parsed.User}/${parsed.Repo}`);
      const postResult = await handleRenderingPost(renderedContentPayload);
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
            throw new Error(postResult.jsonBody.message || "failed to delete");
          }
        }
      }
    });
  } catch (error) {
    const repo =
      typeof message == "object" && !!message && "Repo" in message
        ? message.Repo
        : "unknown repo";
    const user =
      typeof message == "object" && !!message && "User" in message
        ? message.User
        : "unknown user";
    context.error(`Error processing ${user}/${repo}`);
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        context.error(JSON.stringify(issue));
      });
    } else {
      context.error(error);
    }
  }
}

console.log("booting up the renderings bus listener");
app.serviceBusTopic("waLangApiRenderings", {
  connection: "BUS_CONN",
  topicName: "reporendered",
  subscriptionName:
    process.env.NODE_ENV?.toUpperCase() == "DEV"
      ? "will-local"
      : "reporendered-languageapi",
  handler: wacsSbRenderingsApi,
});
