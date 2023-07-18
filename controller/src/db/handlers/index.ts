import * as validations from "../schema/validations";
import {getDb} from "../config";
import {z} from "zod";
import {
  ModelType,
  handlerReturnError,
  polymorphicInsertArgs,
  polymorphicUpdatePayload,
  polymorphicWhereType,
  selectOptions,
  zodValidationKeys,
} from "../../customTypes/types";
import {getError} from "../../utils";
import {PgTransaction} from "drizzle-orm/pg-core";
import {gitRepo} from "../schema/schema";
import {eq} from "drizzle-orm";

// Write out at least create and update handlers for all tables.
// Handlers should all just insert values[] ?
// delete handlers? Auth for delete handlers?
// These should not worry about FK logic.  That should be done in the endpoint route handlers themselves.
// That said, look at your fks and determine what needs to be created first for anything that might be sent in the same payload.
const db = getDb();
/* //@===============  POLYMORHPIC CREATE   =============   */

export async function polymorphicInsert<T extends zodValidationKeys>({
  tableKey,
  content,
  transactionHandle,
  onConflictDoUpdateArgs, //don't really want to worry about getting type exactly right in params. Just as long as you give a transction of some sort here.
  onConflictDoNothingArgs,
}: polymorphicInsertArgs<T>): Promise<ModelType<T>[] | handlerReturnError> {
  const handle = transactionHandle ? transactionHandle : db;
  // db will thorw if this isn't the proper content, but all the api routes have zod validations in them at their call sites
  const validator = z.array(z.unknown());
  const dbTable = validations.insertSchemas[tableKey].table;
  try {
    const parsed = validator.parse(content);
    let query = handle.insert(dbTable).values(parsed);
    if (onConflictDoUpdateArgs) {
      query = query.onConflictDoUpdate(onConflictDoUpdateArgs);
    } else if (onConflictDoNothingArgs) {
      query = onConflictDoNothingArgs.args
        ? query.onConflictDoNothing(onConflictDoNothingArgs.args)
        : query.onConflictDoNothing();
    }
    const retVal = (await query.returning()) as ModelType<T>[];
    return retVal;
  } catch (error) {
    const shapedErr = getError(error);
    return shapedErr;
  }
}

/* //@===============  POLYMORHPIC READ   =============   */

export async function polymorphicSelect<T extends zodValidationKeys>(
  insertSchemaKey: T,
  whereCriteria?: polymorphicWhereType
): Promise<ModelType<T>[] | handlerReturnError>;

export async function polymorphicSelect<
  T extends zodValidationKeys,
  SSelectOptions extends selectOptions
>(
  insertSchemaKey: T,
  selectScope: SSelectOptions,
  whereCriteria?: polymorphicWhereType
): Promise<
  | {[K in keyof SSelectOptions]: SSelectOptions[K]["_"]["data"]}[]
  | handlerReturnError
>;
export async function polymorphicSelect<
  T extends zodValidationKeys,
  SSelectOptions extends selectOptions
>(
  insertSchemaKey: T,
  selectScope?: SSelectOptions,
  whereCriteria?: polymorphicWhereType
) {
  try {
    validations.insertSchemasValidator.parse(insertSchemaKey);
    const validatorObj = validations.insertSchemas[insertSchemaKey];
    const table = validatorObj.table;
    if (!selectScope && !whereCriteria) {
      let retVal = await db.select().from(table);
      return retVal;
    } else if (selectScope && !whereCriteria) {
      let retVal = await db.select(selectScope).from(table);

      return retVal;
    } else if (!selectScope && whereCriteria) {
      let retVal = await db.select().from(table).where(whereCriteria);
      return retVal;
    } else if (selectScope && whereCriteria) {
      let retVal = await db
        .select(selectScope)
        .from(table)
        .where(whereCriteria);
      return retVal;
    }
  } catch (error) {
    const shapedErr = getError(error);
    return shapedErr;
  }
}

/* //@===============  POLYMORHPIC UPDATE   =============   */

export async function polymorphicUpdate<T extends zodValidationKeys>(
  insertSchemaKey: T,
  payload: polymorphicUpdatePayload<T>,
  whereCriteria: polymorphicWhereType,
  transactionHandle?: PgTransaction<any, any, any>
): Promise<ModelType<T>[] | handlerReturnError> {
  const handler = transactionHandle ? transactionHandle : db;
  try {
    // will throw in zod if not a valid table key
    validations.insertSchemasValidator.parse(insertSchemaKey);
    const validatorObj = validations.insertSchemas[insertSchemaKey];
    const table = validatorObj.table;
    const updateValdationSchema = validatorObj.update;
    const parsed = updateValdationSchema.parse(payload);
    const returnValue = await handler
      .update(table)
      .set(parsed)
      .where(whereCriteria)
      .returning();
    return returnValue as ModelType<T>[];
  } catch (error) {
    const shapedErr = getError(error);
    return shapedErr;
  }
}

/* //@===============  POLYMORHPIC DELETE   =============   */

export async function polymorphicDelete<T extends zodValidationKeys>(
  tableKey: T,
  whereCriteria: polymorphicWhereType,
  transactionHandle?: PgTransaction<any, any, any>
): Promise<ModelType<T>[] | handlerReturnError> {
  const handler = transactionHandle ? transactionHandle : db;
  // const validator = validations.insertSchemas[tableKey].schema;
  const table = validations.insertSchemas[tableKey].table;

  try {
    const deleted = (await handler
      .delete(table)
      .where(whereCriteria)
      .returning()) as ModelType<T>[];
    return deleted;
  } catch (error) {
    const shapedErr = getError(error);
    return shapedErr;
  }
}
