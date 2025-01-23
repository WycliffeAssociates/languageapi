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
  handleApiMethodReturn,
  dbTxDidErr,
  statusCodeFromErrType,
} from "../utils";
import * as validators from "./validation";
import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../db/config";
import {createId} from "@paralleldrive/cuid2";
import {handlePost as handleContentPost} from "./content";
import {handlePost as handleRenderingPost} from "./rendering";

// FILE LEVEL SCOPE
const db = getDb();

export async function contentHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const response = await handle(request, context);
  return response;
}
export const contentWithRenderingRoute: externalRouteType = {
  name: "contentWithRendering",
  details: {
    methods: ["POST"],
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
        return handlePostRequest({request, context});
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

// While the service bus function for content from WACS can insert content with its renderings attached, this is a route that is more closely alined to app schema and can be called directly and provides all needed ids for relationships.
async function handlePostRequest({
  request,
  context,
}: {
  request: HttpRequest;
  context: InvocationContext;
}): Promise<HttpResponseInit> {
  const thisMethod = "post";
  let addlErrs: genericErrShape[] = [];
  let status = 200;
  const payload = await request.json();
  context.log({
    message: "Received request to insert content with renderings",
    payload,
  });
  try {
    const validationSchema = validators.contentWithRenderingAttached;
    const payloadParsed = validationSchema.parse(payload);
    const augmented = payloadParsed.map((payload) => {
      const id = createId();
      payload.id = id;
      payload.renderings.forEach((r) => {
        r.contentId = id;
        const tempId = createId();
        r.tempId = tempId;
        if (r.scripturalMeta) {
          r.scripturalMeta.tempId = tempId;
        }
        if (r.nonScripturalMeta) {
          r.nonScripturalMeta.tempId = tempId;
        }
      });
      return payload;
    });
    // any to defer validation to content and renderings routes respectively
    const {content, renderings} = augmented.reduce(
      (acc: {content: any[]; renderings: any[]}, curr) => {
        const {renderings, ...content} = curr;
        acc.content.push(content);
        acc.renderings.push(...renderings);
        return acc;
      },
      {
        content: [],
        renderings: [],
      }
    );
    context.log({
      message: "Inserting content and renderings",
      content,
      renderings,
    });
    const transacted = await db.transaction(async (tx) => {
      const contentInserted = await handleContentPost(content);
      if (dbTxDidErr(contentInserted)) {
        addlErrs.push({
          message: "Error inserting content",
          name: contentInserted.name,
        });
      }
      context.log({
        message: "Content inserted",
        contentInserted,
      });
      if (addlErrs.length) {
        tx.rollback();
      }
      const renderingsInserted = await handleRenderingPost(renderings);
      context.log({
        message: "Renderings inserted",
        renderingsInserted,
      });
      if (dbTxDidErr(renderingsInserted)) {
        addlErrs.push({
          message: "Error inserting renderings",
          name: renderingsInserted.name,
        });
      }
      if (addlErrs.length) {
        tx.rollback();
      }
      return;
    });
    const returnVal = handleApiMethodReturn({
      result: transacted,
      method: thisMethod,
      addlErrs,
      status,
    });
    if (addlErrs.length) {
      throw new Error("Error inserting content or renderings");
    }
    return returnVal;
    // Now that these are joined with unique ids, we should just be able to split and send off to create content and create renderings functions;
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
