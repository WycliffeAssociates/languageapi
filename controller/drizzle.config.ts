import {defineConfig} from "drizzle-kit";
import {config as dotenv} from "dotenv";
dotenv();

const drizzleConfig = defineConfig({
  schema: [
    "./src/db/schema/schema.ts",
    "./src/db/schema/constants.ts",
    "./src/db/schema/relations.ts",
  ],
  out: "./drizzle",
  driver: "pg",
  // @ts-ignore applies to drizzle-kit commands. Can always check back and see if it is fixed
  dialect: "postgresql",
  dbCredentials: {
    connectionString: process.env?.DATABASE_URL || "testValue",
  },
});
// https://orm.drizzle.team/kit-docs/config-reference#schema
// const configInfo: Config = {
//   schema: [
//     "./src/db/schema/schema.ts",
//     "./src/db/schema/constants.ts",
//     "./src/db/schema/relations.ts",
//   ],
//   out: "./drizzle",
//   driver: "pg",
//   dbCredentials: {
//     connectionString: process.env?.DATABASE_URL || "testValue",
//   },
// };
export default drizzleConfig;
