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
import {scripturalRenderingMetadata} from "../db/schema/schema";

// FILE LEVEL SCOPE
const db = getDb();
const tableName: zodValidationKeys = "rendering";
const table = schema.rendering;

export async function renderingHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const renderingRoute: externalRouteType = {
  name: "rendering",
  details: {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: renderingHandler,
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
        return handleDelRequest({request, table});
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
async function handlePostRequest<T extends TableConfig>({
  request,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const payload = await request.json();
  const result = await handlePost(payload);
  return result;
}
export async function handlePost(payload: unknown): Promise<HttpResponseInit> {
  const thisMethod = "post";
  let addlErrs: genericErrShape[] = [];
  let status = 200;

  try {
    const validationSchema = validators.renderingsPost;
    const payloadParsed = validationSchema.parse(payload);
    const payloadsWithNamespacedId = payloadParsed.map((payload) => {
      if (payload.nonScripturalMeta) {
        // I'm intentionally adding string of wrong type here.  and below for expect error. These will not be inserted. I'm adding this property as a way to ensure that in the transaction, once the renderigns are inserted, I can pluck the ids off the inserts ids and map it back to the metadata via this common obj. property
        // @ts-expect-error
        payload.nonScripturalMeta.renderingId = payload.contentId;
      }
      if (payload.scripturalMeta) {
        // @ts-expect-error
        payload.scripturalMeta.renderingId = payload.contentId;
      }
      return payload;
    });

    type accType = {
      renderPayloads: ({tempId: string} & dbTableValidators.insertRendering)[];
      scripturalMetaPayloads: ({
        tempId: string;
      } & dbTableValidators.insertScripturalRenderingMetadata)[];
      nonScripturalMetaPayloads: ({
        tempId: string;
      } & dbTableValidators.insertNonScripturalRenderingMetadata)[];
    };

    const reduced = payloadsWithNamespacedId.reduce(
      (acc: accType, current) => {
        const {scripturalMeta, nonScripturalMeta, ...renderPayload} = current;
        scripturalMeta && acc.scripturalMetaPayloads.push(scripturalMeta);
        nonScripturalMeta &&
          acc.nonScripturalMetaPayloads.push(nonScripturalMeta);
        acc.renderPayloads.push(renderPayload);
        return acc;
      },
      {
        renderPayloads: [],
        scripturalMetaPayloads: [],
        nonScripturalMetaPayloads: [],
      }
    );

    const transacted = await db.transaction(async (tx) => {
      const renderingInserted = await polymorphicInsert({
        tableKey: "rendering", //extra string for type completion instead of tablename variable above
        content: reduced.renderPayloads,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          target: schema.rendering.url,
          set: onConflictSetAllFieldsToSqlExcluded(schema.rendering, ["id"]),
        },
      });
      if (Array.isArray(renderingInserted)) {
        reduced.scripturalMetaPayloads.forEach((payload) => {
          const matchingWithTmpId = reduced.renderPayloads.find((inserted) => {
            // map back from expected error above
            return inserted.tempId == payload.tempId;
          });

          if (matchingWithTmpId) {
            const matchingFromInserted = renderingInserted.find((inserted) => {
              return (
                inserted.hash == matchingWithTmpId.hash &&
                inserted.url == matchingWithTmpId.url
              );
            });
            if (matchingFromInserted) {
              // adjust to number id instead of string
              payload.renderingId = matchingFromInserted.id;
            }
          }
        });
        reduced.nonScripturalMetaPayloads.forEach((payload) => {
          const matchingWithTmpId = reduced.renderPayloads.find((inserted) => {
            return inserted.tempId == payload.tempId;
          });
          if (matchingWithTmpId) {
            const matchingFromInserted = renderingInserted.find((inserted) => {
              return (
                inserted.hash == matchingWithTmpId.hash &&
                inserted.url == matchingWithTmpId.url
              );
            });
            if (matchingFromInserted) {
              payload.renderingId = matchingFromInserted.id;
            }
          }
        });
      }
      let scriptureMetaInserted;
      if (reduced.scripturalMetaPayloads.length) {
        // todo: see if I need to change these onconflicts to somethign else?
        scriptureMetaInserted = await polymorphicInsert({
          tableKey: "scripturalMetadata",
          content: reduced.scripturalMetaPayloads,
          transactionHandle: tx,
          onConflictDoUpdateArgs: {
            target: schema.scripturalRenderingMetadata.id,
            set: onConflictSetAllFieldsToSqlExcluded(
              schema.scripturalRenderingMetadata,
              ["id"]
            ),
          },
        });
      }
      let nonScriptureMeta;
      if (reduced.nonScripturalMetaPayloads.length) {
        nonScriptureMeta = await polymorphicInsert({
          tableKey: "nonScripturalMetaData", //extra string for type completion instead of tablename
          content: reduced.nonScripturalMetaPayloads,
          transactionHandle: tx,
          onConflictDoUpdateArgs: {
            target: schema.nonScripturalRenderingMetadata.id,
            set: onConflictSetAllFieldsToSqlExcluded(
              schema.nonScripturalRenderingMetadata,
              ["id"]
            ),
          },
        });
      }

      [renderingInserted, nonScriptureMeta, scriptureMetaInserted].forEach(
        (dbAction) => {
          if (dbAction && dbTxDidErr(dbAction)) {
            addlErrs.push({
              name: dbAction.name,
              message: dbAction.message,
            });
            status = statusCodeFromErrType(dbAction);
          }
        }
      );
      if (addlErrs.length) {
        console.error(addlErrs);
        tx.rollback();
      }

      return {renderingInserted};
    });
    const returnVal = handleApiMethodReturn({
      result: transacted,
      method: thisMethod,
      addlErrs,
      status,
    });
    return returnVal;
  } catch (error) {
    status = status === 200 ? statusCodeFromErrType(error) : status;
    return handleApiMethodReturn({
      result: error,
      method: thisMethod,
      addlErrs,
      status,
    });
  }
}

async function handleDelRequest<T extends TableConfig>({
  request,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const payload = await request.json();
  const result = await handleDel(payload);
  return result;
}
export async function handleDel(payload: unknown): Promise<HttpResponseInit> {
  const thisMethod = "delete";
  try {
    const deleteSchema = validators.renderingDelete;
    const deletePayloadsParsed = deleteSchema.parse(payload);
    const rowsToDeleteByContentId = deletePayloadsParsed.contentIds;

    // E.g. delete all rendergins (and cascade accross) where the guid of a project is passed
    const deleteOnField = schema.rendering.contentId;
    // const deleteOn
    const result = await polymorphicDelete(
      tableName,
      inArray(deleteOnField, rowsToDeleteByContentId)
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
