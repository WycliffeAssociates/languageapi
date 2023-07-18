import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import * as schema from "./schema";
import {InferModel} from "drizzle-orm";
import {z} from "zod";
import {handlerReturnError, jsonSchema} from "../../customTypes/types";
import {language} from "./schema";

// ZOD DOCS
// https://zod.dev/
// contained within this file are mostly type helpers and zod schema (e.g. runtime validation code). some transforms are declared for data consistency. (e.g. always lowercasing the lang direction enum).  We could enforce some data integrity with foreign keys as well with async refinements, but not needed atm.

// ========= LANGUAGE TABLE
export const insertLanguageSchema = createInsertSchema(schema.language);
export const selectLanguageSchema = createSelectSchema(schema.language);
export type languageType = InferModel<typeof schema.language>;
export type insertLanguage = InferModel<typeof schema.language, "insert">;

// ========= waLangMetadata TABLE
export const insertWaLangMetaSchema = createInsertSchema(schema.waLangMetadata);
export const selectWaLangMetaSchema = createSelectSchema(schema.waLangMetadata);
export type waLangMetaType = InferModel<typeof schema.waLangMetadata>;
export type insertWaLangMeta = InferModel<
  typeof schema.waLangMetadata,
  "insert"
>;

//  ========= LANGUAGE ALT
export const insertLanguageAlternateNameSchema = createInsertSchema(
  schema.languageAlternateName
);
export const selectLanguageAlternateNameSchema = createSelectSchema(
  schema.languageAlternateName
);
export type languageAlternateNameType = InferModel<
  typeof schema.languageAlternateName
>;
export type insertLanguageAlternateName = InferModel<
  typeof schema.languageAlternateName,
  "insert"
>;

// ========= LANG TO LANG
export const insertLanguagesToLanguagesSchema = createInsertSchema(
  schema.languagesToLanguages
);
export const selectLanguagesToLanguagesSchema = createSelectSchema(
  schema.languagesToLanguages
);
export type languagesToLanguagesType = InferModel<
  typeof schema.languagesToLanguages
>;
export type insertLanguagesToLanguages = InferModel<
  typeof schema.languagesToLanguages,
  "insert"
>;

// ========= waLangMetadata TABLE
export const insertWaContentMetaSchema = createInsertSchema(
  schema.waContentMetadata
);
export const selectWaContentMetaSchema = createSelectSchema(
  schema.waContentMetadata
);
export type waContentMetaType = InferModel<typeof schema.waContentMetadata>;
export type insertWaContentMeta = InferModel<
  typeof schema.waContentMetadata,
  "insert"
>;

//  =========content table:
export const insertContentSchema = createInsertSchema(schema.content);
export const selectContentSchema = createSelectSchema(schema.content);
export type contentType = InferModel<typeof schema.content>;
export type insertContent = z.infer<typeof insertContentSchema>; //note the z.infer do to the extend.  Namespace doesn't make it into the db, but connectors are responsible for namespacing themselves id wise

//  ========= connectedContentTable
export const insertConnectedContentSchema = createInsertSchema(
  schema.connectedContent
);
export const selectConnectedContentSchema = createSelectSchema(
  schema.connectedContent
);
export type connectedContentType = InferModel<typeof schema.connectedContent>;
export type insertConnectedContent = InferModel<
  typeof schema.connectedContent,
  "insert"
>;

//  ========= gitRepos
export const insertGitRepoSchema = createInsertSchema(schema.gitRepo);
export const selectGitRepoSchema = createSelectSchema(schema.gitRepo);
export type gitRepoType = InferModel<typeof schema.gitRepo>;
export type insertGitRepo = InferModel<typeof schema.gitRepo, "insert">;

// ========= renderings
export const insertRenderingSchema = createInsertSchema(schema.rendering, {
  fileSizeBytes: (schema) => schema.fileSizeBytes.nonnegative(),
});
export const selectRenderingSchema = createSelectSchema(schema.rendering);
export type renderingType = InferModel<typeof schema.rendering>;
export type insertRendering = InferModel<typeof schema.rendering, "insert">;

//  ========= scripturalRenderingMetadata
export const insertScripturalRenderingMetadataSchema = createInsertSchema(
  schema.scripturalRenderingMetadata,
  {
    bookSlug: () => z.string().trim().toUpperCase(),
  }
);
export const selectScripturalRenderingMetadataSchema = createSelectSchema(
  schema.scripturalRenderingMetadata
);
export type scripturalRenderingMetadataType = InferModel<
  typeof schema.scripturalRenderingMetadata
>;
export type insertScripturalRenderingMetadata = InferModel<
  typeof schema.scripturalRenderingMetadata,
  "insert"
>;

export const insertNonScripturalRenderingMetadataSchema = createInsertSchema(
  schema.nonScripturalRenderingMetadata,
  {
    // open api spec can't handle json, so we just going to have to validate as unknown here for open api sake.
    additionalData: z.unknown(),
  }
);

export const selectNonScripturalRenderingMetadataSchema = createSelectSchema(
  schema.nonScripturalRenderingMetadata
);
export type nonScripturalRenderingMetadataType = InferModel<
  typeof schema.nonScripturalRenderingMetadata
>;
export type insertNonScripturalRenderingMetadata = InferModel<
  typeof schema.nonScripturalRenderingMetadata,
  "insert"
>;

// worldRegion
export const insertWorldRegionSchema = createInsertSchema(schema.worldRegion);
export const selectWorldRegionSchema = createSelectSchema(schema.worldRegion);
export type worldRegionType = InferModel<typeof schema.worldRegion>;
export type insertWorldRegion = InferModel<typeof schema.worldRegion, "insert">;

// country
export const insertCountrySchema = createInsertSchema(schema.country);
export const selectCountrySchema = createSelectSchema(schema.country);
export type countryType = InferModel<typeof schema.country>;
export type insertCountry = InferModel<typeof schema.country, "insert">;

// countryToLanguage
export const insertCountryToLanguageSchema = createInsertSchema(
  schema.countryToLanguage
);
export const selectCountryToLanguageSchema = createSelectSchema(
  schema.countryToLanguage
);
export type countryToLanguageType = InferModel<typeof schema.countryToLanguage>;
export type insertCountryToLanguage = InferModel<
  typeof schema.countryToLanguage,
  "insert"
>;

// This is consume as a conveneient grouping of some tables to schemas. Primarily consumed by the polymorphic handlers
export const insertSchemas = {
  language: {
    schema: insertLanguageSchema,
    update: insertLanguageSchema.partial(),
    table: schema.language,
  },
  langMeta: {
    schema: insertWaLangMetaSchema,
    update: insertWaLangMetaSchema.partial(),
    table: schema.waLangMetadata,
  },
  langAltNames: {
    schema: insertLanguageAlternateNameSchema,
    update: insertLanguageAlternateNameSchema.partial(),
    table: schema.languageAlternateName,
  },
  langToLang: {
    schema: insertLanguagesToLanguagesSchema,
    update: insertLanguagesToLanguagesSchema.partial(),
    table: schema.languagesToLanguages,
  },
  content: {
    schema: insertContentSchema,
    update: insertContentSchema.partial(),
    table: schema.content,
  },
  contentMeta: {
    schema: insertWaContentMetaSchema,
    update: insertWaContentMetaSchema.partial(),
    table: schema.waContentMetadata,
  },
  connectedContent: {
    schema: insertConnectedContentSchema,
    update: insertConnectedContentSchema.partial(),
    table: schema.connectedContent,
  },
  gitRepo: {
    schema: insertGitRepoSchema,
    update: insertGitRepoSchema.partial(),
    table: schema.gitRepo,
  },
  rendering: {
    schema: insertRenderingSchema,
    update: insertRenderingSchema.partial(),
    table: schema.rendering,
  },
  scripturalMetadata: {
    schema: insertScripturalRenderingMetadataSchema,
    update: insertScripturalRenderingMetadataSchema.partial(),
    table: schema.scripturalRenderingMetadata,
  },
  nonScripturalMetaData: {
    schema: insertNonScripturalRenderingMetadataSchema,
    update: insertNonScripturalRenderingMetadataSchema.partial(),
    table: schema.nonScripturalRenderingMetadata,
  },
  worldRegion: {
    schema: insertWorldRegionSchema,
    update: insertWorldRegionSchema.partial(),
    table: schema.worldRegion,
  },
  country: {
    schema: insertCountrySchema,
    update: insertCountrySchema.partial(),
    table: schema.country,
  },
  countryToLanguage: {
    schema: insertCountryToLanguageSchema,
    update: insertCountryToLanguageSchema.partial(),
    table: schema.countryToLanguage,
  },
};

export type tableKeysType = keyof typeof schema;
export const tableKeysValidator = z
  .string()
  .refine((value) => Object.prototype.hasOwnProperty.call(schema, value), {
    message: "Invalid table key",
  });

export const insertSchemasValidator = z
  .string()
  .refine((value) => insertSchemas.hasOwnProperty(value), {
    message: "Invalid object key",
  });
