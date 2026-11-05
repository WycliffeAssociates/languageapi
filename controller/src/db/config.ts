import postgres from "postgres";
import {drizzle, PostgresJsDatabase} from "drizzle-orm/postgres-js";
import * as schema from "./schema/schema";
import "dotenv/config";

let db: PostgresJsDatabase<typeof schema>;

export function getDb() {
  if (db) return db;
  const queryClient = postgres(`${process.env.DATABASE_URL!}`, {
    // The DB only allows 20 client connections and each function instance
    // gets its own pool. prepare:false keeps this working through PgBouncer
    // (transaction pooling, port 6432).
    max: 3,
    idle_timeout: 20,
    prepare: false,
  });
  db = drizzle(queryClient, {
    schema,
  });
  return db;
}
