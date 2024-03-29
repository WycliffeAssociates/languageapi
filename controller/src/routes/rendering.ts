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
    const validationSchema = validators.renderingsPost;
    const payloadParsed = validationSchema.parse(payload);
    const payloadsWithNamespacedId = payloadParsed.map((payload) => {
      const {namespace, ...renderPayload} = payload;
      // port making content ids that are like user-repo.  It should provide a contentId that matches (e.g. user-repo) and a namesapce (dcs).   We prefix it here and make that that its contentId so 'dcs-user-repo'. Another, non-git-system might just use 'ab-en_ulb' for its content id if en_ulb is all it needs as its content identifier. So this is just normalizing and consolidating the namespace plus provided contentId
      const contentId = `${namespace.toLowerCase()}-${renderPayload.contentId}`;
      if (renderPayload.nonScripturalMeta) {
        // I'm intentionally adding string of wrong type here.  and below for expect error. These will not be inserted. I'm adding this property as a way to ensure that in the transaction, once the renderigns are inserted, I can pluck the ids off the inserts ids and map it back to the metadata via this common obj. property
        // @ts-expect-error
        renderPayload.nonScripturalMeta.renderingId = contentId;
      }
      if (renderPayload.scripturalMeta) {
        // @ts-expect-error
        renderPayload.scripturalMeta.renderingId = contentId;
      }
      return {
        ...renderPayload,
        contentId: `${namespace.toLowerCase()}-${renderPayload.contentId}`,
      };
    });

    type accType = {
      renderPayloads: dbTableValidators.insertRendering[];
      scripturalMetaPayloads: dbTableValidators.insertScripturalRenderingMetadata[];
      nonScripturalMetaPayloads: dbTableValidators.insertNonScripturalRenderingMetadata[];
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
        tableKey: "rendering", //extra string for type completion instead of tablename
        content: reduced.renderPayloads,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          target: schema.rendering.url,
          set: onConflictSetAllFieldsToSqlExcluded(schema.rendering, ["id"]),
        },
      });
      if (Array.isArray(renderingInserted)) {
        reduced.scripturalMetaPayloads.forEach((payload) => {
          const matching = renderingInserted.find((inserted) => {
            // map back from expected error above
            return inserted.contentId == String(payload.renderingId);
          });
          if (matching) {
            // adjust to number id instead of string
            payload.renderingId = matching.id;
          }
        });
        reduced.nonScripturalMetaPayloads.forEach((payload) => {
          const matching = renderingInserted.find((inserted) => {
            return inserted.contentId == String(payload.renderingId);
          });
          if (matching) {
            payload.renderingId = matching.id;
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

async function handleDel<T extends TableConfig>({
  request,
  table,
}: apiRouteHandlerArgs<T>): Promise<HttpResponseInit> {
  const thisMethod = "delete";
  try {
    const deletedPayloads = await request.json();
    const deleteSchema = validators.renderingDelete;
    const deletePayloadsParsed = deleteSchema.parse(deletedPayloads);
    const rowsToDeleteByContentId = deletePayloadsParsed.contentIds.map(
      (row) => `${row.namespace}-${row.id}`
    );

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
