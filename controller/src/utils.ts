import {DrizzleError, SQL, sql} from "drizzle-orm";
import {PgTableWithColumns, TableConfig} from "drizzle-orm/pg-core";
import {PostgresError} from "postgres";
import {handlerReturnError} from "./customTypes/types";
import {ZodError} from "zod";

export const BibleBookCategories = {
  OT: [
    "GEN",
    "EXO",
    "LEV",
    "NUM",
    "DEU",
    "JOS",
    "JDG",
    "RUT",
    "1SA",
    "2SA",
    "1KI",
    "2KI",
    "1CH",
    "2CH",
    "EZR",
    "NEH",
    "EST",
    "JOB",
    "PSA",
    "PRO",
    "ECC",
    "SNG",
    "ISA",
    "JER",
    "LAM",
    "EZK",
    "DAN",
    "HOS",
    "JOL",
    "AMO",
    "OBA",
    "JON",
    "MIC",
    "NAM",
    "HAB",
    "ZEP",
    "HAG",
    "ZEC",
    "MAL",
  ],
  NT: [
    "MAT",
    "MRK",
    "LUK",
    "JHN",
    "ACT",
    "ROM",
    "1CO",
    "2CO",
    "GAL",
    "EPH",
    "PHP",
    "COL",
    "1TH",
    "2TH",
    "1TI",
    "2TI",
    "TIT",
    "PHM",
    "HEB",
    "JAS",
    "1PE",
    "2PE",
    "1JN",
    "2JN",
    "3JN",
    "JUD",
    "REV",
  ],
};
interface sortOrderI {
  [key: string]: number;
}
const bibleBookSortOrder = Object.values(BibleBookCategories)
  .flat()
  .reduce((acc: sortOrderI, value: string, index: number) => {
    acc[value] = index + 1;
    return acc;
  }, {});
export {bibleBookSortOrder};

export function getBibleBookSortOrder(slug: string) {
  return bibleBookSortOrder[slug.toUpperCase()] || -1;
}

export function batchArr<T, U>(array: T[], batchSize: number): Array<Array<T>> {
  let batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    batches.push(batch);
  }
  return batches;
}
export function isErrorWithMessage(
  error: unknown
): error is handlerReturnError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

export function toErrorWithMessage(maybeError: unknown): handlerReturnError {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return {
      ...new Error(JSON.stringify(maybeError)),
      didErr: true,
    };
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return {
      ...new Error(JSON.stringify(maybeError)),
      didErr: true,
    };
  }
}

export function getError(error: unknown) {
  let err = toErrorWithMessage(error);
  err.didErr = true;
  return err;
}
interface handleApiMethodReturnParams {
  result: unknown;
  method: string;
  addlErrs?: any[];
  status?: number;
}
export function handleApiMethodReturn({
  result,
  method,
  addlErrs,
  status = 400,
}: handleApiMethodReturnParams) {
  if (isErrorWithMessage(result)) {
    const body: any = {
      message: result.message,
      err: result,
      additionalErrors: addlErrs || [],
    };

    return {
      status,
      jsonBody: body,
    };
  } else {
    let ret =
      method.toLowerCase() == "get"
        ? {
            message: "success",
            ok: true,
            data: result,
          }
        : {
            message: "success",
            ok: true,
          };
    return {
      status: 200,
      jsonBody: ret,
    };
  }
}
export function dbTxDidErr(val: unknown): val is handlerReturnError {
  return (
    typeof val === "object" &&
    val !== null &&
    "didErr" in val &&
    val.didErr == true
  );
}

/**
 * On conflict of target column, given a table, this will return   set the updated value to be the value of the excluded (e.g. conflicting) row.  Thus an upsertValue. It maps from the drizzle column names to the db table names by taking in the table.
 *
 * @param {DrizzleTable} table - The Drizzle table on which the operation is performed.
 * @param {string} [column='id'] - Array of columns to not overwite on update.  Default value is ['id'].
 * @returns {Record<string, SQL<unknown>}
 */
export function onConflictSetAllFieldsToSqlExcluded<
  T extends TableConfig,
  UTableCols extends keyof PgTableWithColumns<T>["_"]["columns"]
>(
  table: PgTableWithColumns<T>,
  omitConflictUpdateKeys: UTableCols[] = ["id" as UTableCols]
) {
  let setVal: Record<string, SQL<unknown>> = {};

  Object.keys(table).forEach((key) => {
    // todo: decide whether to noop timestamps?
    // if (key == "modifiedOn") {
    //   // noop
    // } else if (key == "createdOn") {
    //   // noop
    // } else {

    // console.log(table[key]?.name);
    try {
      if (
        table[key] &&
        table[key].name &&
        !omitConflictUpdateKeys.includes(table[key]?.name as UTableCols)
      ) {
        // NOTE: WITHOUT SQL RAW, the string interpolations will be escaped and won't be interpreted properly.  In postgres world, excluded refers to the row that wasn't inserted due to conflicts
        const sqlval = sql.raw(`excluded.${table[key]?.name}`);
        setVal[key] = sqlval;
      }
    } catch (error) {
      console.error(error);
      return error;
    }
  });
  return setVal;
}
export function statusCodeFromErrType(err: unknown) {
  if (err instanceof DrizzleError) return 500;
  if (err instanceof PostgresError) return 500;
  if (err instanceof TypeError) return 500;
  if (err instanceof ZodError) return 400;
  return 400;
}

export function determineResourceType(slug: string) {
  // "scripture" | "gloss" | "parascriptural" | "peripheral" | null | undefined
  const upperSlug = slug.toUpperCase();
  if (bibleBookSortOrder[upperSlug] !== undefined) {
    return "scripture";
  }
  if (["ULB", "UDB", "F10", "REG"].includes(upperSlug)) {
    return "scripture";
  }
  if (["TN", "TQ", "BC"].includes(upperSlug)) {
    return "parascriptural";
  }
  if (["TW"].includes(upperSlug)) {
    return "peripheral";
  }
  return "unknown";
}
