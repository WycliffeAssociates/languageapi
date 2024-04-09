import type {Config} from "drizzle-kit";
import {config as dotenv} from "dotenv";
dotenv();

// https://orm.drizzle.team/kit-docs/config-reference#schema
const configInfo: Config = {
  schema: [
    "./src/db/schema/schema.ts",
    "./src/db/schema/constants.ts",
    "./src/db/schema/relations.ts",
  ],
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env?.DATABASE_URL || "testValue",
  },
};
export default configInfo;
