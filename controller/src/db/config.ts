import postgres from "postgres";
import {drizzle, PostgresJsDatabase} from "drizzle-orm/postgres-js";
import * as schema from "./schema/schema";
import "dotenv/config";

let db: PostgresJsDatabase<typeof schema>;

export function getDb() {
  if (db) return db;
  const queryClient = postgres(`${process.env.DATABASE_URL!}`, {
    max: 2,
  });
  db = drizzle(queryClient, {
    schema,
  });
  return db;
}
