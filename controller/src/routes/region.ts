import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  apiRouteHandlerArgs,
  externalRouteType,
  genericErrShape,
  zodValidationKeys,
} from "../customTypes/types";
import {
  polymorphicDelete,
  polymorphicInsert,
  polymorphicSelect,
} from "../db/handlers";
import {
  handleApiMethodReturn,
  onConflictSetAllFieldsToSqlExcluded,
  statusCodeFromErrType,
} from "../utils";
import * as validators from "./validation";
import * as schema from "../db/schema/schema";
import {inArray} from "drizzle-orm";
import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../db/config";
import {dbTxDidErr} from "../utils";

// FILE LEVEL SCOPE
const db = getDb();
const tableName: zodValidationKeys = "worldRegion";
const table = schema.worldRegion;

export async function regionHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const regionRoute: externalRouteType = {
  name: "region",
  details: {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: regionHandler,
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
    const payload = await request.json();
    // Parse here cause countries come with additional ietf from port
    const validationSchema = validators.regionPost;
    const payloadParsed = validationSchema.parse(payload);

    const transacted = await db.transaction(async (tx) => {
      const regionInserted = await polymorphicInsert({
        tableKey: tableName,
        content: payloadParsed,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          target: schema.worldRegion.name,
          set: onConflictSetAllFieldsToSqlExcluded(schema.worldRegion),
        },
      });
      if (dbTxDidErr(regionInserted)) {
        addlErrs.push({
          name: regionInserted.name,
          message: regionInserted.message,
        });
        status = statusCodeFromErrType(regionInserted);
      }
      if (addlErrs.length) {
        tx.rollback();
      }
      return regionInserted;
    });
    // only when successful
    const returnVal = handleApiMethodReturn({
      result: transacted,
      method: thisMethod,
    });
    return returnVal;
  } catch (error) {
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
    const deleteSchema = validators.regionDelete;
    const deletePayloadsParsed = deleteSchema.parse(deletedPayloads);
    const deleteOnField = schema.worldRegion.name;
    const result = await polymorphicDelete(
      tableName,
      inArray(deleteOnField, deletePayloadsParsed.regionNames)
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
  table,
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
