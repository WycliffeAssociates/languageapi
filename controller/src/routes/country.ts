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
  onConflictSetAllFieldsToSqlExcluded,
  statusCodeFromErrType,
} from "../utils";
import * as validators from "./validation";
import * as dbTableValidators from "../db/schema/validations";
import * as schema from "../db/schema/schema";
import {inArray, sql} from "drizzle-orm";
import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../db/config";

// FILE LEVEL SCOPE
const db = getDb();
const tableName = "country";
const table = schema.country;

export async function countryHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const countryRoute: externalRouteType = {
  name: "country",
  details: {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: countryHandler,
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
    // Parse here cause countries come with additional ietf from port
    const validationSchema = validators.countryPost;
    const payloadParsed = validationSchema.parse(payload);
    const separated = payloadParsed.reduce(
      (
        acc: {
          payloads: dbTableValidators.insertCountry[];
          region: dbTableValidators.insertWorldRegion[];
          regionNameCountryMap: Record<string, string>;
        },
        current
      ) => {
        const {regionName, ...countryPayload} = current;
        acc.payloads.push({
          ...countryPayload,
        });
        acc.region.push({
          name: regionName,
        });
        // helper
        acc.regionNameCountryMap[countryPayload.alpha2] = regionName;
        return acc;
      },
      {
        payloads: [],
        region: [],
        regionNameCountryMap: {},
      }
    );

    const transacted = await db.transaction(async (tx) => {
      // Create any regions first if they don't exist:
      const newRegions = await polymorphicInsert({
        tableKey: "worldRegion",
        content: separated.region,
        onConflictDoNothingArgs: {
          hasArgs: true,
          args: {
            target: schema.worldRegion.name,
          },
        },
      });
      const allRegions = await polymorphicSelect("worldRegion");
      if (Array.isArray(allRegions)) {
        separated.payloads = separated.payloads.map((payload) => {
          const regionNameForThisCountry =
            separated.regionNameCountryMap[payload.alpha2];
          const regionId = allRegions.find((region) => {
            return (
              region.name.toLowerCase() ===
              regionNameForThisCountry.toLowerCase()
            );
          });
          return {
            ...payload,
            worldRegionId: regionId?.id,
          };
        });
      }
      const countriesInserted = await polymorphicInsert({
        tableKey: tableName,
        content: separated.payloads,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          target: schema.country.alpha2,
          set: onConflictSetAllFieldsToSqlExcluded(schema.country),
        },
      });

      if (dbTxDidErr(countriesInserted)) {
        addlErrs.push({
          name: countriesInserted.name,
          message: countriesInserted.message,
        });
        status = statusCodeFromErrType(countriesInserted);
        tx.rollback();
      }
      return {countriesInserted};
    });
    const returnVal = handleApiMethodReturn({
      result: transacted,
      method: thisMethod,
    });
    return returnVal;
  } catch (error) {
    // a safe guard to make sure we aren't somehow sending a 200 from here on out.
    status = status === 200 ? statusCodeFromErrType(error) : status;
    return handleApiMethodReturn({
      result: error,
      method: thisMethod,
      status,
      addlErrs,
    });
  }
}
async function handleDel<T extends TableConfig>({
  request,
  table,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "delete";
  try {
    const deletedPayloads = await request.json();
    const deleteSchema = validators.countryDelete;
    const deletePayloadsParsed = deleteSchema.parse(deletedPayloads);
    const deleteOnField = schema.country.alpha2;
    const result = await polymorphicDelete(
      tableName,
      inArray(deleteOnField, deletePayloadsParsed.alpha2Codes)
    );
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
async function handleGet<T extends TableConfig>({
  request,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "get";
  try {
    let result = await polymorphicSelect(tableName);
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
