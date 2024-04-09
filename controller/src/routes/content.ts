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
  onConflictSetAllFieldsToSqlExcluded,
  dbTxDidErr,
  statusCodeFromErrType,
} from "../utils";
import * as validators from "./validation";
import * as dbTableValidators from "../db/schema/validations";
import * as schema from "../db/schema/schema";
import {eq, inArray} from "drizzle-orm";
import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../db/config";
import {createId} from "@paralleldrive/cuid2";

// FILE LEVEL SCOPE
const db = getDb();
const tableName = "content";
const table = schema.content;

export async function contentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const contentRoute: externalRouteType = {
  name: tableName,
  details: {
    methods: ["GET", "POST", "DELETE"],
    authLevel: "anonymous",
    handler: contentHandler,
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
    // Parse here cause countries come with additional ietf from port
    const validationSchema = validators.contentPost;
    const payloadParsed = validationSchema.parse(payload);
    const payloadsWithGuids = payloadParsed.map((payload) => {
      return {
        ...payload,
        id: createId(),
      };
    });
    type accType = {
      contentPayloads: dbTableValidators.insertContent[];
      contentMetaPayloads: Array<
        dbTableValidators.insertWaContentMeta & temporaryNameSpaceMapper
      >;
      gitPayload: Array<
        dbTableValidators.insertGitRepo & temporaryNameSpaceMapper
      >;
    };
    type temporaryNameSpaceMapper = {
      namespace: string;
      name: string;
    };
    const split = payloadsWithGuids.reduce(
      (acc: accType, curr) => {
        const {meta, gitEntry, ...restContent} = curr;
        acc.contentPayloads.push(restContent);
        if (meta) {
          const metaPayload: dbTableValidators.insertWaContentMeta &
            temporaryNameSpaceMapper = {
            ...meta,
            // todo: namespace-name is the human readable way to get a content row, so temporarily put those on meta and git ancillary objeects, so that once in or upserted we can map the ID's back to the these two tables.
            contentId: restContent.id,
            namespace: restContent.namespace,
            name: restContent.name,
          };
          acc.contentMetaPayloads.push(metaPayload);
        }
        if (gitEntry) {
          const entry: dbTableValidators.insertGitRepo &
            temporaryNameSpaceMapper = {
            ...gitEntry,
            contentId: restContent.id, //git route requires a namespace to match, but if it were passed as a batch to "content" then we can just tack it on here and skip the namespacing.
            namespace: restContent.namespace,
            name: restContent.name,
          };
          acc.gitPayload.push(entry);
        }
        return acc;
      },
      {
        contentPayloads: [],
        contentMetaPayloads: [],
        gitPayload: [],
      }
    );

    const transacted = await db.transaction(async (tx) => {
      // Content must insert before git bc git entries have a fk on
      // not all content must have git id
      // git id is serial generated
      const contentInserted = await polymorphicInsert({
        tableKey: tableName,
        content: split.contentPayloads,
        transactionHandle: tx,
        onConflictDoUpdateArgs: {
          // need to see that if we try to update the same name/namespace that it is indeed an upsert so the cuids don't change.
          target: [schema.content.namespace, schema.content.name],
          set: onConflictSetAllFieldsToSqlExcluded(schema.content),
        },
      });

      if (dbTxDidErr(contentInserted)) {
        tx.rollback();
        throw new Error("could not update content rows");
      }

      let metaInserted = null;
      if (split.contentMetaPayloads.length) {
        // Get cuids from the inserted row and attach: to contentMeta table and gitTable again for if this was an upsert
        split.contentMetaPayloads = split.contentMetaPayloads?.map(
          (payload) => {
            // find matching content row inserted, and make sure it's id is this id.
            const matching = contentInserted.find((row) => {
              return (
                row.namespace === payload.namespace && row.name === payload.name
              );
            });
            if (matching) {
              payload.contentId = matching.id;
            }
            return payload;
          }
        );

        metaInserted = await polymorphicInsert({
          tableKey: "contentMeta",
          content: split.contentMetaPayloads,
          transactionHandle: tx,
          onConflictDoUpdateArgs: {
            target: schema.waContentMetadata.contentId,
            set: onConflictSetAllFieldsToSqlExcluded(schema.waContentMetadata),
          },
        });
      }
      let attachedGitInserted = null;
      if (split.gitPayload.length) {
        split.gitPayload = split.gitPayload?.map((payload) => {
          // find matching content row inserted, and make sure it's id is this id.
          const matching = contentInserted.find((row) => {
            return (
              row.namespace === payload.namespace && row.name === payload.name
            );
          });
          if (matching) {
            payload.contentId = matching.id;
          }
          return payload;
        });

        attachedGitInserted = await polymorphicInsert({
          tableKey: "gitRepo",
          content: split.gitPayload,
          transactionHandle: tx,
          onConflictDoUpdateArgs: {
            target: schema.gitRepo.contentId,
            set: onConflictSetAllFieldsToSqlExcluded(schema.gitRepo, [
              "id",
              "contentId",
            ]),
          },
        });
      }

      [metaInserted, contentInserted, attachedGitInserted].forEach(
        (dbAction) => {
          if (dbAction && dbTxDidErr(dbAction)) {
            console.error(dbAction.stack);
            addlErrs.push({
              name: dbAction.name,
              message: dbAction.message,
            });
            status = statusCodeFromErrType(dbAction);
          }
        }
      );
      if (addlErrs.length) {
        tx.rollback();
      }

      return {...metaInserted, ...contentInserted, ...attachedGitInserted};
    });
    const returnVal = handleApiMethodReturn({
      result: transacted,
      method: thisMethod,
      addlErrs,
      status,
    });
    return returnVal;
  } catch (error) {
    status = status == 200 ? statusCodeFromErrType(error) : status;

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
    const deleteSchema = validators.contentDelete;
    const deletePayloadsParsed = deleteSchema.parse(deletedPayloads);
    const deleteOnField = table.id;
    const result = await polymorphicDelete(
      tableName,
      inArray(deleteOnField, deletePayloadsParsed.ids)
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
