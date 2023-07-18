import {
  apiRouteHandlerArgs,
  externalRouteType,
  zodValidationKeys,
} from "../../customTypes/types";
import {polymorphicDelete, polymorphicInsert, polymorphicSelect} from "./index";
import {
  handleApiMethodReturn,
  dbTxDidErr,
  onConflictSetAllFieldsToSqlExcluded,
} from "../../utils";

import * as dbTableValidators from "../schema/validations";
import * as schema from "../schema/schema";
// import {inArray, sql} from "drizzle-orm";
// import {TableConfig} from "drizzle-orm/pg-core";
import {getDb} from "../config";
import {z} from "zod";
import {fi} from "@faker-js/faker";
import {inArray} from "drizzle-orm";
import {PgTableWithColumns, TableConfig} from "drizzle-orm/pg-core";
import {scripturalRenderingMetadata} from "../schema/schema";

const db = getDb();

interface handlerArgs<T extends TableConfig> {
  zodMapKey: zodValidationKeys;
  table: PgTableWithColumns<T>;
}
// todo;  these for the other tables
// async function postFileType(filePayload: unknown) {
//   try {
//     // const zodValidatorKey:zodValidationKeys = 'fileType'
//     const validationSchema = z.array(dbTableValidators.insertFileTypeSchema);
//     const payload = validationSchema.parse(filePayload);
//     const inserted = await polymorphicInsert({
//       tableKey: "fileType",
//       content: payload,
//       onConflictDoUpdateArgs: {
//         target: schema.fileType.fileType,
//         set: onConflictSetAllFieldsToSqlExcluded(schema.fileType, ["id"]),
//       },
//     });
//     return inserted;
//   } catch (error) {
//     return error;
//   }
// }
// async function getFileType() {
//   const table = schema.fileType;
//   try {
//     const returned = await polymorphicSelect("fileType");
//     return returned;
//   } catch (error) {
//     return error;
//   }
// }
// async function deleteFileType(filePayload: unknown) {
//   const deleteOnField = schema.fileType.fileType;
//   try {
//     const deleteSchema = z.object({
//       types: z.array(z.string()),
//     });
//     const parsed = deleteSchema.parse(filePayload);
//     const deletedItems = await polymorphicDelete(
//       "fileType",
//       inArray(deleteOnField, parsed.types)
//     );
//     return deletedItems;
//   } catch (error) {
//     return error;
//   }
// }

async function postRendering(payload: unknown) {
  const zodMapKey: zodValidationKeys = "rendering";
  const table = schema.rendering;

  try {
    const validationSchema = z.array(dbTableValidators.insertRenderingSchema);
    const validatedPayload = validationSchema.parse(payload);
    // todo: not sure how to best update renderings. There isn't naturally a very unique index apart from url, but if the url changes, that would not trigger a conflict, but a whole new record.  But if the url is going to change... We should probably just say blow it all away for a resource and create anew, but otherwise use the url as the "unique"
    const inserted = await polymorphicInsert({
      tableKey: zodMapKey,
      content: validatedPayload,
      onConflictDoUpdateArgs: {
        target: table.url,
        set: onConflictSetAllFieldsToSqlExcluded(table, ["id"]),
      },
    });
    return inserted;
  } catch (error) {
    return error;
  }
}
async function getRendering() {
  const zodMapKey: zodValidationKeys = "rendering";
  try {
    const returned = await polymorphicSelect(zodMapKey);
    return returned;
  } catch (error) {
    return error;
  }
}
async function deleteRendering(filePayload: unknown) {
  const table = schema.rendering;
  const zodMapKey: zodValidationKeys = "rendering";
  // todo: not sure what makes the most sense here either.  Ids naturally, but of course, clients don't get these ids.  We could say content_id to blow it all renderings away for a piece of content. That seems pretty large of an issue. But using Id, I'm assuming if this route is needed that a client can request down to the level of file type / content _id etc; to delete.  Or even do an ilike of its url to delete based on a content id.
  const deleteOnField = table.id;

  try {
    const deleteSchema = z.object({
      ids: z.array(z.number()),
    });
    const parsed = deleteSchema.parse(filePayload);
    const deletedItems = await polymorphicDelete(
      zodMapKey,
      inArray(deleteOnField, parsed.ids)
    );
    return deletedItems;
  } catch (error) {
    return error;
  }
}

async function scripturalRenderingMeta(method: string, payload: unknown) {
  const zodMapKey: zodValidationKeys = "scripturalMetadata";
  const table = schema.scripturalRenderingMetadata;
  const args = {
    zodMapKey,
    table,
  };

  switch (method) {
    case "get":
      return await getScripturalRenderingMeta(payload, args);
    case "create":
      return await postScripturalRenderingMeta(payload, args);
      break;
    case "delete":
      return await deleteScripturalRenderingMeta(payload, args);
    default:
      break;
  }
}

async function postScripturalRenderingMeta<T extends TableConfig>(
  payload: unknown,
  {zodMapKey, table}: handlerArgs<T>
) {
  try {
    const validationSchema = z.array(
      dbTableValidators.insertScripturalRenderingMetadataSchema
    );
    const validatedPayload = validationSchema.parse(payload);

    const inserted = await polymorphicInsert({
      tableKey: zodMapKey,
      content: validatedPayload,
      onConflictDoUpdateArgs: {
        target: table.id,
        set: onConflictSetAllFieldsToSqlExcluded(table, ["id"]),
      },
    });
    return inserted;
  } catch (error) {
    return error;
  }
}
async function getScripturalRenderingMeta<T extends TableConfig>(
  payload: unknown,
  {zodMapKey, table}: handlerArgs<T>
) {
  try {
    const returned = await polymorphicSelect(zodMapKey);
    return returned;
  } catch (error) {
    return error;
  }
}
async function deleteScripturalRenderingMeta<T extends TableConfig>(
  payload: unknown,
  {zodMapKey, table}: handlerArgs<T>
) {
  const deleteOnField = table.id;

  try {
    const deleteSchema = z.object({
      ids: z.array(z.number()),
    });
    const parsed = deleteSchema.parse(payload);
    const deletedItems = await polymorphicDelete(
      zodMapKey,
      inArray(deleteOnField, parsed.ids)
    );
    return deletedItems;
  } catch (error) {
    return error;
  }
}

// NON SCRIPTURAL RENDERING META
async function nonScripturalRenderingMeta(method: string, payload: unknown) {
  const zodMapKey: zodValidationKeys = "nonScripturalMetaData";
  const table = schema.nonScripturalRenderingMetadata;
  const args = {
    zodMapKey,
    table,
  };

  switch (method) {
    case "get":
      return await getNonScripturalRenderingMeta(payload, args);
    case "create":
      return await postNonScripturalRenderingMeta(payload, args);
      break;
    case "delete":
      return await deleteNonScripturalRenderingMeta(payload, args);
    default:
      break;
  }
}

async function postNonScripturalRenderingMeta<T extends TableConfig>(
  payload: unknown,
  {zodMapKey, table}: handlerArgs<T>
) {
  try {
    const validationSchema = z.array(
      dbTableValidators.insertNonScripturalRenderingMetadataSchema
    );
    const validatedPayload = validationSchema.parse(payload);

    const inserted = await polymorphicInsert({
      tableKey: zodMapKey,
      content: validatedPayload,
      onConflictDoUpdateArgs: {
        target: table.id,
        set: onConflictSetAllFieldsToSqlExcluded(table, ["id"]),
      },
    });
    return inserted;
  } catch (error) {
    return error;
  }
}
async function getNonScripturalRenderingMeta<T extends TableConfig>(
  payload: unknown,
  {zodMapKey, table}: handlerArgs<T>
) {
  try {
    const returned = await polymorphicSelect(zodMapKey);
    return returned;
  } catch (error) {
    return error;
  }
}
async function deleteNonScripturalRenderingMeta<T extends TableConfig>(
  payload: unknown,
  {zodMapKey, table}: handlerArgs<T>
) {
  const deleteOnField = table.id;

  try {
    const deleteSchema = z.object({
      ids: z.array(z.number()),
    });
    const parsed = deleteSchema.parse(payload);
    const deletedItems = await polymorphicDelete(
      zodMapKey,
      inArray(deleteOnField, parsed.ids)
    );
    return deletedItems;
  } catch (error) {
    return error;
  }
}
