import type {Config} from "drizzle-kit";
import {config as dotenv} from "dotenv";
dotenv();

// https://orm.drizzle.team/kit-docs/config-reference#schema
// doing from dist bc there are esm imports in these files, and natively run generate doesn't handle esm imports, so we build to resolve es, and point it at these 3 files.
// const conn = process.env?.DATABASE_URL
//   ? process.env?.DATABASE_URL
//   : "testValue";
const configInfo: Config = {
  schema: [
    "./dist/src/db/schema/schema.js",
    "./dist/src/db/schema/constants.js",
    "./dist/src/db/schema/relations.js",
  ],
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env?.DATABASE_URL_AZ || "testValue",
  },
};
export default configInfo;
