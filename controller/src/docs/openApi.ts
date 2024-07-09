import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import {z} from "zod";
import * as apiValidators from "../routes/validation";
import * as dbValidators from "../db/schema/validations";
import * as mocks from "../db/utils/getMocks";
import {writeFileSync} from "fs";
import {resolve} from "path";
// @ts-ignore no types exists
import Converter from "api-spec-converter";
// https://github.com/LucyBot-Inc/api-spec-converter

extendZodWithOpenApi(z);
const registry = new OpenAPIRegistry();

//@ register schemas
const registeredInsertLang = registry.register(
  "language",
  apiValidators.langPost.openapi({
    example: [mocks.getMockedLang()],
  })
);

const registeredInsertCountry = registry.register(
  "country",
  apiValidators.countryPost.openapi({
    example: [mocks.getMockedCountry()],
  })
);
const registeredInsertContent = registry.register(
  "content",
  apiValidators.contentPost.openapi({
    example: [mocks.getMockedContent()],
  })
);
const registerInsertedRegion = registry.register(
  "region",
  apiValidators.regionPost.openapi({
    example: [mocks.getMockedRegion()],
  })
);
const registerInsertedGit = registry.register(
  "git",
  apiValidators.gitPost.openapi({
    example: [mocks.getMockedGit()],
  })
);
const registerInsertedRender = registry.register(
  "rendering",
  apiValidators.renderingsPost.openapi({
    examples: [
      [mocks.getMockedRendering()],
      [mocks.getMockedRendering("nonscripture")],
    ],
  })
);

const zodHandlerSchema = registry.register(
  "apiError",
  z.object({
    message: z.string(),
    err: z.object({
      issues: z.array(z.any()).optional(),
      didErr: z.boolean().optional(),
      name: z.string().optional(),
    }),
    addlErrs: z.array(
      z.object({
        message: z.string(),
        name: z.string(),
      })
    ),
  })
);
const ok200Res = registry.register(
  "okRes",
  z.object({
    message: z.string(),
    ok: z.boolean().default(true),
  })
);

//@ register api paths
/* //#===============  COUNTRY ROUTES   =============   */
registry.registerPath({
  method: "post",
  operationId: "CreateCountry",
  path: prefixRoute("country"),
  description: "Add one or more country",
  request: {
    body: {
      description: "A list of countries",
      content: {
        "applications/json": {
          schema: registeredInsertCountry,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Object with inserted country data",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
registry.registerPath({
  method: "get",
  operationId: "GetCountry",
  path: prefixRoute("country"),
  description: "Get country",
  responses: {
    200: {
      description: "All countries",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            data: z.array(dbValidators.selectCountrySchema),
          }),
        },
      },
    },
  },
});
registry.registerPath({
  method: "delete",
  operationId: "DeleteCountry",
  path: prefixRoute("country"),
  description: "Delete one or more countries",
  // apiValidators.langDelete
  request: {
    body: {
      description: "",
      content: {
        "applications/json": {
          schema: apiValidators.countryDelete,
        },
      },
    },
  },
  responses: {
    200: {
      description: "confirmation message of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});

//#===============  LANG ROUTES   =============   */
registry.registerPath({
  method: "post",
  operationId: "CreateLanguage",
  path: prefixRoute("language"),
  description: "Add one or more language",
  request: {
    body: {
      description: "A list of languages",
      content: {
        "applications/json": {
          schema: registeredInsertLang,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Object with inserted language data",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
registry.registerPath({
  method: "get",
  operationId: "GetLanguage",
  path: prefixRoute("language"),
  description: "Get language",
  responses: {
    200: {
      description: "All languages",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            ok: z.boolean(),
            data: z.array(dbValidators.selectLanguageSchema),
          }),
        },
      },
    },
  },
});
registry.registerPath({
  method: "delete",
  operationId: "DeleteLanguage",
  path: prefixRoute("language"),
  description: "Delete one or more languages",
  // apiValidators.langDelete
  request: {
    body: {
      description: "A list of ietfCodes corresponding to languages to delete",
      content: {
        "applications/json": {
          schema: apiValidators.langDelete,
        },
      },
    },
  },
  responses: {
    200: {
      description: "confirmation message of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
//#===============  CONTENT ROUTES   =============   */
registry.registerPath({
  method: "post",
  operationId: "CreateContent",
  path: prefixRoute("content"),
  description: "Add one or more repo/content",
  request: {
    body: {
      description: "A list of projects/content",
      content: {
        "applications/json": {
          schema: registeredInsertContent,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Object with inserted content data",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
registry.registerPath({
  method: "get",
  operationId: "GetContent",
  path: prefixRoute("content"),
  description: "Get content",
  responses: {
    200: {
      description: "All content",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            ok: z.boolean(),
            data: z.array(dbValidators.selectContentSchema),
          }),
        },
      },
    },
  },
});
registry.registerPath({
  method: "delete",
  operationId: "DeleteContent",
  path: prefixRoute("content"),
  description: "Delete one or more content/repo",
  // apiValidators.langDelete
  request: {
    body: {
      description: "",
      content: {
        "applications/json": {
          schema: apiValidators.contentDelete,
        },
      },
    },
  },
  responses: {
    200: {
      description: "confirmation message of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});

//#===============  REGION ROUTES   =============   */
registry.registerPath({
  method: "post",
  operationId: "CreateRegion",
  path: prefixRoute("region"),
  description: "Add one or more regions",
  request: {
    body: {
      description: "A list of regions",
      content: {
        "applications/json": {
          schema: registerInsertedRegion,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Object with inserted region data",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
registry.registerPath({
  method: "get",
  operationId: "GetRegion",
  path: prefixRoute("region"),
  description: "Get region",
  responses: {
    200: {
      description: "All regions",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            ok: z.boolean(),
            data: z.array(dbValidators.selectWorldRegionSchema),
          }),
        },
      },
    },
  },
});
registry.registerPath({
  method: "delete",
  operationId: "DeleteRegion",
  path: prefixRoute("region"),
  description: "Delete one or more regions",
  // apiValidators.langDelete
  request: {
    body: {
      description:
        "A list of regions by their regionName corresponding to regions to delete",
      content: {
        "applications/json": {
          schema: apiValidators.regionDelete,
        },
      },
    },
  },
  responses: {
    200: {
      description: "confirmation message of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
//#===============  GIT ROUTES   =============   */
registry.registerPath({
  method: "post",
  operationId: "CreateGit",
  path: prefixRoute("git"),
  description: "Add one or more git entries",
  request: {
    body: {
      description: "A list of git entries to add",
      content: {
        "applications/json": {
          schema: registerInsertedGit,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Confirmation of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
registry.registerPath({
  method: "get",
  operationId: "GetGit",
  path: prefixRoute("git"),
  description: "Get git entries",
  responses: {
    200: {
      description: "All git entries",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            ok: z.boolean(),
            data: z.array(dbValidators.selectGitRepoSchema),
          }),
        },
      },
    },
  },
});
registry.registerPath({
  method: "delete",
  operationId: "DeleteGit",
  path: prefixRoute("git"),
  description: "Delete one or git entries",
  // apiValidators.langDelete
  request: {
    body: {
      description:
        "A list of username and repo (composite key) used to delete git repos",
      content: {
        "applications/json": {
          schema: apiValidators.gitDelete,
        },
      },
    },
  },
  responses: {
    200: {
      description: "confirmation message of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
//#===============  RENDERING ROUTES   =============   */
registry.registerPath({
  method: "post",
  operationId: "CreateRendering",
  path: prefixRoute("rendering"),
  description: "Add one or more renders/links of content",
  request: {
    body: {
      description: "A list of renders/links to add",
      content: {
        "applications/json": {
          schema: registerInsertedRender,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Confirmation of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});
registry.registerPath({
  method: "get",
  operationId: "GetRendering",
  path: prefixRoute("rendering"),
  description: "Get renderings",
  responses: {
    200: {
      description: "All renderings",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            ok: z.boolean(),
            data: z.array(dbValidators.selectRenderingSchema),
          }),
        },
      },
    },
  },
});
registry.registerPath({
  method: "delete",
  operationId: "DeleteRendering",
  path: prefixRoute("rendering"),
  description: "Delete one or more renderings",
  // apiValidators.langDelete
  request: {
    body: {
      description:
        "A list of namespaces and content ids (e.g. namespace=wacs, contentId=user-repo to use to delete renderings",
      content: {
        "applications/json": {
          schema: apiValidators.renderingDelete,
        },
      },
    },
  },
  responses: {
    200: {
      description: "confirmation message of successful operation",
      content: {
        "application/json": {
          schema: ok200Res,
        },
      },
    },
    400: returns400(),
  },
});

// @  get generator
const generator = new OpenApiGeneratorV3(registry.definitions);

const doc = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
    description: "This is the API",
  },
  servers: [
    {
      url: "/",
    },
  ],
});
const writePath = resolve("./src/docs/open_api_v3.json");
writeFileSync(writePath, JSON.stringify(doc), {
  flag: "w+",
});
openApi3ToSwagger2(doc);

async function openApi3ToSwagger2(doc: unknown) {
  let converted = await Converter.convert({
    from: "openapi_3",
    to: "swagger_2",
    source: doc,
  });
  const stringified = converted.stringify();
  writeFileSync("./src/docs/open_api_v2.json", stringified, {
    flag: "w+",
  });
}

function prefixRoute(route: string) {
  return `/api/${route}`;
}
function returns400(
  description: string = "Error with details of improper request"
) {
  return {
    description: description,
    content: {
      "application/json": {
        schema: zodHandlerSchema,
      },
    },
  };
}
