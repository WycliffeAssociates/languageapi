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
  polymorphicUpdate,
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
import {inArray, sql, ilike, eq} from "drizzle-orm";
import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../db/config";

// FILE LEVEL SCOPE
const db = getDb();
const tableName = "gitRepo";
const table = schema.gitRepo;

export async function gitHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const gitRoute: externalRouteType = {
  name: "git",
  details: {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: gitHandler,
  },
};

async function handle(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    switch (request.method) {
      case "POST":
        return handlePostRequest({request, table});
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
export async function handlePost<T extends TableConfig>(
  payload: unknown
): Promise<HttpResponseInit> {
  const thisMethod = "post";
  let addlErrs: genericErrShape[] = [];
  let status = 200;
  try {
    // Parse here cause countries come with additional ietf from port
    // Is
    const validationSchema = validators.gitPost;
    const payloadParsed = validationSchema.parse(payload);

    const transacted = await db.transaction(async (tx) => {
      const gitInserted = await polymorphicInsert({
        tableKey: tableName,
        content: payloadParsed,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          // this is teh content cuid
          target: schema.gitRepo.contentId,
          set: onConflictSetAllFieldsToSqlExcluded(schema.gitRepo, [
            "id",
            "contentId",
          ]),
        },
      });

      if (dbTxDidErr(gitInserted)) {
        addlErrs.push({
          name: gitInserted.name,
          message: gitInserted.message,
        });
        status = statusCodeFromErrType(gitInserted);
      }
      if (addlErrs.length) {
        tx.rollback();
      }

      return {gitInserted};
    });

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
async function handlePostRequest<T extends TableConfig>({
  request,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  // went up one layer so the core logic just takes a payload.  This fxn specifically takes an http request and gets the json off it
  const payload = await request.json();
  const result = await handlePost(payload);
  return result;
}

async function handleDel<T extends TableConfig>({
  request,
  table,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "delete";
  try {
    const deletedPayloads = await request.json();
    const deleteSchema = validators.gitDelete;
    const deletePayloadsParsed = deleteSchema.parse(deletedPayloads);
    const values = deletePayloadsParsed.userRepo.map(({username, repo}) => [
      username,
      repo,
    ]);
    // todo: if this resolves, use orm instead of raw. these are column names
    // https://github.com/drizzle-team/drizzle-orm/issues/534
    const whereSql = sql`(username, repo_name) IN ${values}`;
    const result = await polymorphicDelete(tableName, whereSql);
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
  // errors that throw are handled in parent
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
