import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  apiRouteHandlerArgs,
  externalRouteType,
  genericErrShape,
} from "../customTypes/types";
import {
  polymorphicDelete,
  polymorphicInsert,
  polymorphicSelect,
} from "../db/handlers";
import {
  handleApiMethodReturn,
  dbTxDidErr,
  statusCodeFromErrType,
} from "../utils";
import * as validators from "./validation";
import * as dbTableValidators from "../db/schema/validations";
import * as schema from "../db/schema/schema";
import {eq, inArray} from "drizzle-orm";
import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../db/config";
import {onConflictSetAllFieldsToSqlExcluded} from "../utils";
import {z} from "zod";
import {PostgresError} from "postgres";
import {doBlackListLangauge} from "../lib/blacklist";

// FILE LEVEL SCOPE
const db = getDb();
const tableName = "language";
const table = schema.language;

export async function languageHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const languageRoute: externalRouteType = {
  name: "language",
  details: {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: languageHandler,
  },
};

async function handle(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    switch (request.method) {
      case "POST":
        return handlePost({request, table});
      case "DELETE":
        return handleDel({request, table});
      case "GET":
        return handleGet({request, table});
      default:
        return {
          status: 404,
          jsonBody: {
            message: "Resource not found",
            data: null,
          },
        };
    }
  } catch (error) {
    let status = statusCodeFromErrType(error);
    return handleApiMethodReturn({
      result: error,
      method: request.method,
      status,
    });
  }
}
async function handlePost<T extends TableConfig>({
  request,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "post";
  let addlErrs: genericErrShape[] = [];
  let status = 200;
  try {
    // errors that throw are handled in parent
    const payload = await request.json();
    const validationSchema = validators.langPost;
    const payloadParsed = validationSchema.parse(payload);
    // Get those not blacklisted
    const payloadFiltered = payloadParsed.filter(
      (lang) => !doBlackListLangauge(lang)
    );

    const separated = parseLangPayload(payloadFiltered);

    // validate langCountry and altNames now:
    const validatedCountryLangPivot = validators.postLangToCountryMany.parse(
      separated.countryLangPivot
    );
    const validatedLangAltNames =
      separated.alterateNames.length &&
      validators.postLangAltNamesMany.parse(separated.alterateNames);

    const transacted = await db.transaction(async (tx) => {
      const langsInserted = await polymorphicInsert({
        tableKey: tableName,
        content: separated.payloads,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          target: schema.language.id, //the port guid since ietfs can change
          set: onConflictSetAllFieldsToSqlExcluded(schema.language),
        },
      });
      // todo: really not sure on best way to manage the many attachement on lang for update/delete for this pivot table and the lang altnames below.  altnames won't insert same record more than once with ietf/name unique.  country_lang has a ietf/alph2 primary Key that is unique, so it won't insert same record more than once either
      const langCountryInsert = await polymorphicInsert({
        tableKey: "countryToLanguage",
        content: validatedCountryLangPivot,
        transactionHandle: tx,
        onConflictDoNothingArgs: {
          hasArgs: false,
        },
      });
      let langAltNames;
      if (validatedLangAltNames) {
        // just clear out all rows for alt names and recreate its alt names from scratch:
        await polymorphicDelete(
          "langAltNames",
          inArray(
            schema.languageAlternateName.languageIetfCode,
            validatedLangAltNames.map((l) => l.languageIetfCode)
          ),
          tx
        );

        langAltNames = await polymorphicInsert({
          tableKey: "langAltNames",
          content: validatedLangAltNames,
          transactionHandle: tx,
          onConflictDoNothingArgs: {
            hasArgs: true,
            args: {
              target: [
                schema.languageAlternateName.name,
                schema.languageAlternateName.languageIetfCode,
              ],
            },
          },
        });
      }
      let gatewayLangs;
      if (separated.gatewayLanguage.length) {
        gatewayLangs = await polymorphicInsert({
          tableKey: "langToLang",
          content: separated.gatewayLanguage,
          transactionHandle: tx,
          onConflictDoNothingArgs: {
            hasArgs: false,
          },
        });
      }

      let waLanguageMeta;
      if (separated.waLangMeta.length) {
        waLanguageMeta = await polymorphicInsert({
          tableKey: "langMeta",
          content: separated.waLangMeta,
          transactionHandle: tx,
          onConflictDoUpdateArgs: {
            target: schema.waLangMetadata.ietfCode,
            set: onConflictSetAllFieldsToSqlExcluded(schema.waLangMetadata),
          },
        });
      }

      [
        langsInserted,
        langAltNames,
        langCountryInsert,
        gatewayLangs,
        waLanguageMeta,
      ].forEach((dbAction) => {
        if (dbAction && dbTxDidErr(dbAction)) {
          addlErrs.push({
            name: dbAction.name,
            message: dbAction.message,
          });
          if (dbAction instanceof PostgresError) {
            status = 500;
          }
        }
      });
      if (addlErrs.length) {
        tx.rollback();
      }
      return {
        langsInserted,
        langCountryInsert,
        langAltNames,
        gatewayLangs,
        waLanguageMeta,
      };
    });

    const returnVal = handleApiMethodReturn({
      result: transacted,
      method: thisMethod,
      addlErrs,
      status,
    });
    return returnVal;
  } catch (error) {
    return handleApiMethodReturn({
      result: error,
      method: thisMethod,
      addlErrs,
      status,
    });
  }
}
async function handleDel<T extends TableConfig>({
  request,
  table,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "delete";
  let addlErrs: genericErrShape[] = [];

  try {
    // Also, unlike inserts, dels on langs or countries should cascade to the pivot and small tables so need need to delete from meta/alternate names etc;.
    const deletedPayloads = await request.json();
    const deletePayloadsParsed = validators.langDelete.parse(deletedPayloads);
    const deleteOnField = schema.language.ietfCode;
    // ids an not ietf bc. ietfs can change;
    const result = await polymorphicDelete(
      tableName,
      inArray(deleteOnField, deletePayloadsParsed.ietfCodes)
    );
    const returnVal = handleApiMethodReturn({
      result,
      method: thisMethod,
      addlErrs,
    });
    return returnVal;
  } catch (error) {
    return handleApiMethodReturn({
      result: error,
      method: thisMethod,
      status: statusCodeFromErrType(error),
    });
  }
}
async function handleGet<T extends TableConfig>({
  request,
  table,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "get";
  // errors that throw are handled in parent
  try {
    let result = await polymorphicSelect("language");
    const returnVal = handleApiMethodReturn({
      result,
      method: thisMethod,
    });
    return returnVal;
  } catch (error) {
    return handleApiMethodReturn({
      result: error,
      method: thisMethod,
      status: statusCodeFromErrType(error),
    });
  }
}

function parseLangPayload(langPost: z.infer<typeof validators.langPost>) {
  const result = langPost.reduce(
    (
      acc: {
        payloads: dbTableValidators.insertLanguage[];
        countryLangPivot: dbTableValidators.insertCountryToLanguage[];
        alterateNames: dbTableValidators.insertLanguageAlternateName[];
        waLangMeta: dbTableValidators.insertWaLangMeta[];
        gatewayLanguage: dbTableValidators.insertLanguagesToLanguages[];
      },
      current
    ) => {
      const {
        allCountryAlpha2,
        waLangMeta,
        alternateNames,
        gatewayIetf,
        ...langPayload
      } = current;

      acc.payloads.push(langPayload);
      acc.countryLangPivot.push({
        languageIetf: langPayload.ietfCode,
        countryAlpha: langPayload.homeCountryAlpha2,
      });

      if (allCountryAlpha2) {
        allCountryAlpha2.forEach((alpha2) => {
          acc.countryLangPivot.push({
            countryAlpha: alpha2,
            languageIetf: langPayload.ietfCode,
          });
        });
      }

      if (alternateNames) {
        alternateNames.forEach((altName) => {
          acc.alterateNames.push({
            name: altName,
            languageIetfCode: langPayload.ietfCode,
          });
        });
      }

      if (waLangMeta) {
        acc.waLangMeta.push({
          ietfCode: langPayload.ietfCode,
          isGateway: waLangMeta.isGateway,
          showOnBiel: waLangMeta.showOnBiel,
        });
      }

      if (gatewayIetf) {
        acc.gatewayLanguage.push({
          gatewayLanguageId: gatewayIetf,
          gatewayLanguageToId: langPayload.ietfCode,
        });
      }

      return acc;
    },
    {
      payloads: [],
      countryLangPivot: [],
      alterateNames: [],
      waLangMeta: [],
      gatewayLanguage: [],
    }
  );

  return result;
}
