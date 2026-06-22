import * as schema from "../db/schema/schema";
import {getDb} from "../db/config";
import {eq, and, inArray, sql} from "drizzle-orm";

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
        // Case-INSENSITIVE match (one row per lower(url)): find the existing row
        // whatever its casing so the caller can attach its id for the meta
        // upserts. We only have a slice of the files from the bus message, so we
        // filter to just those urls; anything not found will be inserted.
        inArray(
          sql`lower(${schema.rendering.url})`,
          urlArray.map((u) => u.toLowerCase())
        )
      )
    );
  return renderedContentRowsAlreadyInDb;
}
