import {HttpFunctionOptions, HttpRequest} from "@azure/functions";
import * as validations from "../db/schema/validations";
import {InferSelectModel, SQL} from "drizzle-orm";
import {
  AnyPgColumn,
  IndexColumn,
  PgDatabase,
  PgTableWithColumns,
  PgTransaction,
  PgUpdateSetSource,
  TableConfig,
} from "drizzle-orm/pg-core";
import {PostgresJsQueryResultHKT} from "drizzle-orm/postgres-js";
import {z} from "zod";
import * as schema from "../db/schema/schema";

export type externalRouteType = {
  name: string;
  details: HttpFunctionOptions;
};
// The global db or an open transaction. Callers already inside db.transaction pass their tx so the work stays on that connection (a nested .transaction() becomes a savepoint) instead of checking out a second one from the pool and deadlocking it.
export type DbHandle = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

export type zodValidationKeys = keyof typeof validations.insertSchemas;
// export type zodValidationObj<T extends zodValidationKeys> = typeof validations.insertSchemas<T>

export type ModelType<TZodKey extends zodValidationKeys> = InferSelectModel<
  (typeof validations.insertSchemas)[TZodKey]["table"]
>;

export type polymorphicInsertArgs<T extends zodValidationKeys> = {
  tableKey: T;
  content: unknown;
  transactionHandle?: PgTransaction<any, any, any>;
  onConflictDoUpdateArgs?: {
    target: IndexColumn | IndexColumn[];
    where?: SQL;
    set: PgUpdateSetSource<(typeof validations.insertSchemas)[T]["table"]>;
    // set: PgUpdateSetSource<typeof schema.language>;
  };
  onConflictDoNothingArgs?: {
    hasArgs: boolean;
    args?: {
      target?: IndexColumn | IndexColumn[];
      where?: SQL;
    };
  };
};
//    set: PgUpdateSetSource<typeof schema.language>;
//     set: PgUpdateSetSource<
// (typeof validations.insertSchemas)[T]["table"]
type x = polymorphicInsertArgs<"language">["onConflictDoUpdateArgs"];
//   ^?

export type polymorphicWhereType = SQL<unknown> | undefined;
export type selectOptions = Record<string, AnyPgColumn>;
export type polymorphicUpdatePayload<T extends zodValidationKeys> = z.infer<
  (typeof validations.insertSchemas)[T]["update"]
>;
export interface handlerReturnError extends Error {
  message: string;
  didErr: boolean;
}
export type apiRouteHandlerArgs<T extends TableConfig> = {
  request: HttpRequest;
  table: PgTableWithColumns<T>;
};
export type genericErrShape = {
  message: string;
  name: string;
};

// https://zod.dev/?id=json-type
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | {[key: string]: Json} | Json[];
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    literalSchema,
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ])
);
