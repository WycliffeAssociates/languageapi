import {app, InvocationContext, Timer} from "@azure/functions";
import {getDb as startDb} from "../db/config";
import {onConflictSetAllFieldsToSqlExcluded} from "../utils";
import * as dbSchema from "../db/schema/schema";
import {eq, and, isNotNull, like, notInArray, ne} from "drizzle-orm";

const db = startDb();

export async function populateGlUsfmSources(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log(
    `Timer function processed request. at ${new Date()}.  Next is ${
      myTimer.scheduleStatus?.next
    }`
  );
  try {
    await getApplicableContentRows(context);
  } catch (error) {
    context.error(error);
  }
  // console.log({body});
  // we want to query
  // all content, where
  // the language -> wa_language_metadata -> is_gateway is true'
  // the domain is scripture (for usfm)
  // where there is not an existing source.usfm in the renderings table for that content
}

async function getApplicableContentRows(context: InvocationContext) {
  let WACS_API_URL = process.env.WACS_API_URL;
  if (!WACS_API_URL) {
    throw new Error("WACS_API_URL is not set");
  }
  let rows = await getActiveUsfmScriptureContent();
  context.log(`There are ${rows.length} gateway content rows`);

  // let testCase = res.slice(0, 5);
  let apiBaseUrl = `${WACS_API_URL}/repos`;

  // ie "01-GEN"
  let usfmRegex = /(\d{2})-(\w{3})/i;
  let counter = 0;
  for await (const row of rows) {
    try {
      const baseArgs = {
        baseUrl: apiBaseUrl,
        // coerce bc the query for these rows has an isNotNull on these two props.
        user: row.gitUser!,
        repo: row.gitRepo!,
      };
      // We need the lastest sha on master in order to make a call for the tree
      const sha = await getWacsContentSha(baseArgs);
      // from the tree, we only want the usfm paths
      const usfmFiles = await getWacsUsfmFromTree({
        ...baseArgs,
        sha,
        regex: usfmRegex,
      });

      // This loop is serially because I was having problem with doing a batch insert with CTE's causing duplicate parts of the query to reserve the same serial id which was causing the insert to fail. It's fine to just do this as a cron and not stress about the prf of the serial async loop though for this.
      for await (const f of usfmFiles) {
        const match = f.path.match(usfmRegex);
        const bookSlug = match[2].toUpperCase();
        let bookName = await getBookNameFromExistingData({
          bookSlug,
          languageId: row.languageId,
        });
        let rawUrl = `${apiBaseUrl}/${row.gitUser}/${
          row.gitRepo
        }/raw/${encodeURIComponent(f.path)}`;
        await transactDbRowForUsfm({
          bookName,
          bookSlug,
          contentId: row.contentId,
          size: f.size,
          rawUrl,
          sha,
        });
      }
      counter++;
      if (counter % 5 === 0) {
        console.log(`counter: ${counter}`);
      }
    } catch (e) {
      context.error(row.gitUser, row.gitRepo, e);
    }
  }
  // return res;
}

async function getActiveUsfmScriptureContent() {
  const {
    rendering,
    content,
    language,
    gitRepo,
    waLangMetadata,
    waContentMetadata,
  } = dbSchema;
  let sourceUsfmSubQuery = db
    .select({
      contentId: rendering.contentId,
    })
    .from(rendering)
    // source.usfm is a file produced for btt writer repos. There are some random writer repos that are in gls, but we only want those which have been combined into a single repo.  And there's already usfm for those, so no need to double up
    .where(like(rendering.url, "%source.usfm"));

  let res = await db
    .select({
      gitUser: gitRepo.username,
      gitRepo: gitRepo.repoName,
      contentId: content.id,
      languageId: content.languageId,
    })
    .from(content)
    .leftJoin(language, eq(content.languageId, language.ietfCode))
    .leftJoin(waLangMetadata, eq(language.ietfCode, waLangMetadata.ietfCode))
    .leftJoin(gitRepo, eq(content.id, gitRepo.contentId))
    .leftJoin(waContentMetadata, eq(waContentMetadata.contentId, content.id))
    .where(
      and(
        // get hls
        eq(waLangMetadata.isGateway, true),
        // usfm only applies to scripture
        eq(content.domain, "scripture"),
        // not in source.usfm
        notInArray(content.id, sourceUsfmSubQuery),
        // has to be on wacs to use wacs api for getting raw files
        isNotNull(gitRepo.username),
        isNotNull(gitRepo.repoName),
        // even for hls, there's a lot of noise of wacs repos that are marked as inactive that aren't likely interesting.  So ignore those
        ne(waContentMetadata.status, "Inactive")
      )
    );
  return res;
}

type WacsArgs = {
  baseUrl: string;
  user: string;
  repo: string;
};
type WacsArgsAndSha = WacsArgs & {
  sha: string;
  regex: RegExp;
};

async function getWacsContentSha({baseUrl, user, repo}: WacsArgs) {
  const res = await fetch(`${baseUrl}/${user}/${repo}/git/refs/heads/master`);
  const body = await res.json();
  return body[0]?.object?.sha;
}
async function getWacsUsfmFromTree({
  baseUrl,
  user,
  repo,
  sha,
  regex,
}: WacsArgsAndSha) {
  const treeRes = await fetch(
    `${baseUrl}/${user}/${repo}/git/trees/${sha}?recursive=true`
  );
  const treeBody = await treeRes.json();
  const usfmFiles = treeBody?.tree?.filter(
    (f: any) =>
      f.path.endsWith("usfm") && f.type === "blob" && f.path.match(regex).length
  );
  return usfmFiles;
}

async function getBookNameFromExistingData({
  languageId,
  bookSlug,
}: {
  languageId: string | null;
  bookSlug: string;
}) {
  let bookName: string | null = null;
  if (languageId) {
    let bookQ = await db.query.localization.findFirst({
      columns: {
        value: true,
      },
      where(localization, {and, ilike, eq}) {
        return and(
          eq(localization.ietfCode, languageId!),
          eq(localization.category, "bible_book"),
          ilike(localization.key, bookSlug)
        );
      },
    });
    bookName = bookQ?.value ?? null;
    return bookName;
  }
}

type TransactDbRowForUsfmArgs = {
  contentId: string;
  size: number;
  rawUrl: string;
  sha: string;
  bookSlug: string;
  bookName: string | null | undefined;
};
async function transactDbRowForUsfm({
  contentId,
  size,
  rawUrl,
  sha,
  bookName,
  bookSlug,
}: TransactDbRowForUsfmArgs) {
  const {scripturalRenderingMetadata, rendering} = dbSchema;
  return await db.transaction(async (tx) => {
    const renderedRow = await tx
      .insert(rendering)
      .values({
        contentId: contentId,
        fileType: "usfm",
        fileSizeBytes: size,
        url: rawUrl,
        hash: sha,
      })
      .onConflictDoUpdate({
        target: [rendering.url],
        set: onConflictSetAllFieldsToSqlExcluded(rendering, [
          "contentId",
          "modifiedOn",
        ]),
      })
      .returning({
        id: rendering.id,
      });
    // meta row insertion
    await tx
      .insert(scripturalRenderingMetadata)
      .values({
        bookSlug: bookSlug,
        bookName: bookName,
        isWholeBook: true,
        isWholeProject: false,
        chapter: null,
        renderingId: renderedRow[0]?.id,
      })
      .onConflictDoUpdate({
        target: [scripturalRenderingMetadata.renderingId],
        set: onConflictSetAllFieldsToSqlExcluded(scripturalRenderingMetadata),
      });
  });
}

app.timer("populateGlUsfmSources", {
  // Once every 12 hours.
  schedule: "0 3 */12 * * *",
  handler: populateGlUsfmSources,
  useMonitor: process.env.NODE_ENV?.toUpperCase() == "DEV" ? false : true,
});

/* 
 `https://content.bibletranslationtools.org/api/v1/repos/${
          row.gitUser
        }/${row.gitRepo}/raw/${encodeURIComponent(f.path)}`;
*/
