import {pgEnum} from "drizzle-orm/pg-core";

export const langDirectionsEnum = pgEnum("direction", ["ltr", "rtl"]);
export const contentTypeEnum = pgEnum("type_id", [
  "text",
  "audio",
  "video",
  "braille",
]);
export const contentDomainEnum = pgEnum("domain", [
  "scripture",
  "gloss",
  "parascriptural",
  "peripheral",
]);
