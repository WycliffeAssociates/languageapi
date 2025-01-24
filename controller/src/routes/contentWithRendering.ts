import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {externalRouteType, genericErrShape} from "../customTypes/types";
import {
  checkContentExists,
  handleApiMethodReturn,
  statusCodeFromErrType,
} from "../utils";
import * as validators from "./validation";
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
    message: "Received request for content+renderings",
    payload,
  });
  try {
    const validationSchema = validators.contentWithRenderingAttached;
    const payloadParsed = validationSchema.parse(payload);

    // Insert (or upsert) content
    const {content} = payloadParsed.reduce(
      (acc: {content: any[]}, curr) => {
        const {renderings, ...content} = curr;
        acc.content.push(content);
        return acc;
      },
      {
        content: [],
      }
    );

    const transacted = await db.transaction(async (tx) => {
      const contentInserted = await handleContentPost(content);
      context.log({
        message: "inserting content",
      });
      if (contentInserted.status != 200) {
        context.warn({
          message: "Error inserting content",
          contentInsertedResponse: JSON.stringify(contentInserted),
        });
        tx.rollback();
      }
      // content Inserted is an http response, but we don't send back those in post requests right now, so just query for what we just inserted to get the ids:
      // Get those ids from inserted and add to the renderings for fk constraint
      for await (const payload of payloadParsed) {
        const existing = await checkContentExists({
          db,
          name: payload.name,
          namespace: payload.namespace,
        });
        let id = existing.id!;
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
      }
      const renderingsOnly = payloadParsed
        .map((payload) => payload.renderings)
        .flat();
      // post the renderings
      const renderingsInserted = await handleRenderingPost(renderingsOnly);
      context.log({
        message: "inserting renderings for that content",
        payload: JSON.stringify(renderingsOnly),
      });
      if (renderingsInserted.status != 200) {
        context.warn({
          message: "Error inserting renderings",
          renderingsReponse: JSON.stringify(renderingsInserted),
        });
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
