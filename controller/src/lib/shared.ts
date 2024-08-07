import * as schema from "../db/schema/schema";
import {getDb} from "../db/config";
import {eq, and, inArray} from "drizzle-orm";

const db = getDb();

type prepareRenderedContentForUpsertArgs = {
  contentCuid: string;
  urlArray: string[];
};

export async function getExistingRenderedContentRows({
  contentCuid,
  urlArray,
}: prepareRenderedContentForUpsertArgs) {
  const renderedContentRowsAlreadyInDb = await db
    .select({
      renderedRowId: schema.rendering.id,
      url: schema.rendering.url,
      metadataId: schema.scripturalRenderingMetadata.id,
      nonScripturalMetadataId: schema.nonScripturalRenderingMetadata.id,
      createdAt: schema.rendering.createdAt,
    })
    .from(schema.rendering)
    .leftJoin(
      schema.scripturalRenderingMetadata,
      eq(schema.rendering.id, schema.scripturalRenderingMetadata.renderingId)
    )
    .leftJoin(
      schema.nonScripturalRenderingMetadata,
      eq(schema.rendering.id, schema.nonScripturalRenderingMetadata.renderingId)
    )
    .where(
      and(
        eq(schema.rendering.contentId, contentCuid),
        // we only have a slice of the files from bus meesage, so we should filter this result based on the urls from parsed queue message: What this query returns will be mapped against queue messages for ids and then updated.  If there is something from queue that is not in db, it'll be inserted.
        inArray(schema.rendering.url, urlArray)
      )
    );
  return renderedContentRowsAlreadyInDb;
}
