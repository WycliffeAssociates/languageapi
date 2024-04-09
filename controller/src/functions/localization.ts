import {app, InvocationContext, Timer} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {localizations} from "../localizations";
import type {insertLocalizationType} from "../db/schema/validations";
import {insertSchemas} from "../db/schema/validations";
import {polymorphicInsert} from "../db/handlers";
import {onConflictSetAllFieldsToSqlExcluded} from "../utils";
import * as dbSchema from "../db/schema/schema";
import {eq, sql, and, ilike, isNotNull} from "drizzle-orm";
import {z} from "zod";
const db = startDb();
const table = insertSchemas.localization.table;

// you can run azrue crons  manually by invoking
// http://localhost:7071/admin/functions/manageLocalizationTable.  (or the function name below). You must use a post request, header of Content-Type application/json, and the body as follows { "input": "anything"}. The body doesn't actually matter
export async function populateLocalization(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log("Timer function processed request.");
  const bookNamesResult = await populateScripturalBookNames();
  context.log(
    Array.isArray(bookNamesResult)
      ? `inserted ${bookNamesResult.length} rows of book names`
      : bookNamesResult.message
  );
  const resourceTypesResult = await populationResourceTypes();
  context.log(
    Array.isArray(resourceTypesResult)
      ? `inserted ${resourceTypesResult.length} rows of resource types`
      : resourceTypesResult.message
  );
}

async function populationResourceTypes() {
  const category = "resource_type";
  const payload = localizations.reduce(
    (acc: insertLocalizationType[], curr) => {
      const rows = Object.entries(curr.dict).map(([key, value]) => {
        return {ietfCode: curr.ietf, key, value, category};
      });
      acc.push(...rows);
      return acc;
    },
    []
  );
  // no need for a transaction since its just the one sql action
  const res = await polymorphicInsert({
    tableKey: "localization",
    content: payload,
    onConflictDoUpdateArgs: {
      target: [table.ietfCode, table.key],
      // loops through every column in given table setting the column to be the value of the excluded (e.g. conflicting) row except for those given in the second argument. For localization though, it just updates the value.
      set: onConflictSetAllFieldsToSqlExcluded(table, ["ietfCode", "key"]),
    },
  });
  return res;
}

async function populateScripturalBookNames() {
  const {scripturalRenderingMetadata, rendering, content, language, gitRepo} =
    dbSchema;
  //@ this is the raw sql version of what the orm below is doing
  // const query = sql.raw(`SELECT book_name, book_slug, ietf_code, id
  // FROM (SELECT book_name, book_slug, l.ietf_code, c.id,
  // ROW_NUMBER() OVER (PARTITION BY l.ietf_code, book_slug ORDER BY book_slug) AS rn
  //     FROM scriptural_rendering_metadata AS srm
  //     JOIN rendering AS r ON r.id = srm.rendering_id
  //     JOIN content AS c ON r.content_id = c.id
  //     JOIN language AS l ON l.ietf_code = c.language_id
  //     JOIN git_repo AS gr ON c.git_id = gr.id
  //     WHERE gr.username ILIKE '%wa-catalog%'
  //     AND c.domain = 'scripture'
  //     AND book_slug IS NOT NULL
  // ) AS subquery
  // WHERE rn = 1
  // ORDER BY ietf_code, book_slug;`);

  const subquery = db
    .select({
      book_name: scripturalRenderingMetadata.bookName,
      book_slug: scripturalRenderingMetadata.bookSlug,
      ietf_code: language.ietfCode,
      id: content.id,
      rn: sql
        .raw(
          "ROW_NUMBER() OVER (PARTITION BY ietf_code, book_slug ORDER BY book_slug)"
        )
        .as("rn"),
    })
    .from(scripturalRenderingMetadata)
    .leftJoin(
      rendering,
      eq(rendering.id, scripturalRenderingMetadata.renderingId)
    )
    .leftJoin(content, eq(content.id, rendering.contentId))
    .leftJoin(language, eq(language.ietfCode, content.languageId))
    .leftJoin(gitRepo, eq(content.id, gitRepo.contentId))
    .where(
      and(
        ilike(gitRepo.username, "%wa-catalog%"),
        eq(content.domain, "scripture"),
        isNotNull(scripturalRenderingMetadata.bookSlug)
      )
    )
    .as("sq");
  const result = await db
    .select({
      book_name: subquery.book_name,
      book_slug: subquery.book_slug,
      ietf_code: subquery.ietf_code,
      id: subquery.id,
    })
    .from(subquery)
    .where(eq(subquery.rn, 1))
    .orderBy(subquery.ietf_code, subquery.book_slug);

  // rowList should be book_name, book_slug, ietf_code, id (content id that is);
  // zod validate this;

  const parsed = z
    .array(
      z.object({
        book_name: z.string(),
        book_slug: z.string(),
        ietf_code: z.string(),
        id: z.string(),
      })
    )
    .parse(result);
  const category = "bible_book";
  const payload: insertLocalizationType[] = parsed.map((row) => {
    return {
      ietfCode: row.ietf_code,
      key: row.book_slug.toLowerCase(),
      value: row.book_name,
      category,
    };
  });
  const inserted = await polymorphicInsert({
    tableKey: "localization",
    content: payload,
    onConflictDoUpdateArgs: {
      target: [table.ietfCode, table.key],
      set: onConflictSetAllFieldsToSqlExcluded(table, ["ietfCode", "key"]),
    },
  });
  return inserted;
}

app.timer("manageLocalizationTable", {
  schedule: "0 0 0 * * *",
  handler: populateLocalization,
  useMonitor: false,
});

// For resource types,
