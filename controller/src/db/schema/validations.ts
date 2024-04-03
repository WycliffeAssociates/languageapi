import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import * as schema from "./schema";
import {InferInsertModel, InferSelectModel} from "drizzle-orm";
import {z} from "zod";
import {localization} from "./schema";

// ZOD DOCS
// https://zod.dev/
// contained within this file are mostly type helpers and zod schema (e.g. runtime validation code). some transforms are declared for data consistency. (e.g. always lowercasing the lang direction enum).  We could enforce some data integrity with foreign keys as well with async refinements, but not needed atm.

// ========= LANGUAGE TABLE
export const insertLanguageSchema = createInsertSchema(schema.language);
export const selectLanguageSchema = createSelectSchema(schema.language);
export type languageType = InferSelectModel<typeof schema.language>;
export type insertLanguage = InferInsertModel<typeof schema.language>;

// ========= waLangMetadata TABLE
export const insertWaLangMetaSchema = createInsertSchema(schema.waLangMetadata);
export const selectWaLangMetaSchema = createSelectSchema(schema.waLangMetadata);
export type waLangMetaType = InferSelectModel<typeof schema.waLangMetadata>;
export type insertWaLangMeta = InferInsertModel<typeof schema.waLangMetadata>;

//  ========= LANGUAGE ALT
export const insertLanguageAlternateNameSchema = createInsertSchema(
  schema.languageAlternateName
);
export const selectLanguageAlternateNameSchema = createSelectSchema(
  schema.languageAlternateName
);
export type languageAlternateNameType = InferSelectModel<
  typeof schema.languageAlternateName
>;
export type insertLanguageAlternateName = InferInsertModel<
  typeof schema.languageAlternateName
>;

// ========= LANG TO LANG
export const insertLanguagesToLanguagesSchema = createInsertSchema(
  schema.languagesToLanguages
);
export const selectLanguagesToLanguagesSchema = createSelectSchema(
  schema.languagesToLanguages
);
export type languagesToLanguagesType = InferSelectModel<
  typeof schema.languagesToLanguages
>;
export type insertLanguagesToLanguages = InferInsertModel<
  typeof schema.languagesToLanguages
>;

// ========= waLangMetadata TABLE
export const insertWaContentMetaSchema = createInsertSchema(
  schema.waContentMetadata
);
export const selectWaContentMetaSchema = createSelectSchema(
  schema.waContentMetadata
);
export type waContentMetaType = InferSelectModel<
  typeof schema.waContentMetadata
>;
export type insertWaContentMeta = InferInsertModel<
  typeof schema.waContentMetadata
>;

//  =========content table:
export const insertContentSchema = createInsertSchema(schema.content);
export const selectContentSchema = createSelectSchema(schema.content);
export type contentType = InferSelectModel<typeof schema.content>;
export type insertContent = z.infer<typeof insertContentSchema>; //note the z.infer do to the extend.  Namespace doesn't make it into the db, but connectors are responsible for namespacing themselves id wise

//  ========= connectedContentTable
export const insertConnectedContentSchema = createInsertSchema(
  schema.connectedContent
);
export const selectConnectedContentSchema = createSelectSchema(
  schema.connectedContent
);
export type connectedContentType = InferSelectModel<
  typeof schema.connectedContent
>;
export type insertConnectedContent = InferInsertModel<
  typeof schema.connectedContent
>;

//  ========= gitRepos
export const insertGitRepoSchema = createInsertSchema(schema.gitRepo);
export const selectGitRepoSchema = createSelectSchema(schema.gitRepo);
export type gitRepoType = InferSelectModel<typeof schema.gitRepo>;
export type insertGitRepo = InferInsertModel<typeof schema.gitRepo>;

// ========= renderings
export const insertRenderingSchema = createInsertSchema(schema.rendering, {
  fileSizeBytes: (schema) => schema.fileSizeBytes.nonnegative(),
});
export const selectRenderingSchema = createSelectSchema(schema.rendering);
export type renderingType = InferSelectModel<typeof schema.rendering>;
export type insertRendering = InferInsertModel<typeof schema.rendering>;

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
export type scripturalRenderingMetadataType = InferSelectModel<
  typeof schema.scripturalRenderingMetadata
>;
export type insertScripturalRenderingMetadata = InferInsertModel<
  typeof schema.scripturalRenderingMetadata
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
export type nonScripturalRenderingMetadataType = InferSelectModel<
  typeof schema.nonScripturalRenderingMetadata
>;
export type insertNonScripturalRenderingMetadata = InferInsertModel<
  typeof schema.nonScripturalRenderingMetadata
>;

// worldRegion
export const insertWorldRegionSchema = createInsertSchema(schema.worldRegion);
export const selectWorldRegionSchema = createSelectSchema(schema.worldRegion);
export type worldRegionType = InferSelectModel<typeof schema.worldRegion>;
export type insertWorldRegion = InferInsertModel<typeof schema.worldRegion>;

// country
export const insertCountrySchema = createInsertSchema(schema.country);
export const selectCountrySchema = createSelectSchema(schema.country);
export type countryType = InferSelectModel<typeof schema.country>;
export type insertCountry = InferInsertModel<typeof schema.country>;

// countryToLanguage
export const insertCountryToLanguageSchema = createInsertSchema(
  schema.countryToLanguage
);
export const selectCountryToLanguageSchema = createSelectSchema(
  schema.countryToLanguage
);
export type countryToLanguageType = InferSelectModel<
  typeof schema.countryToLanguage
>;
export type insertCountryToLanguage = InferInsertModel<
  typeof schema.countryToLanguage
>;

// LOCALIZATION TABLE

export const insertLocalizationSchema = createInsertSchema(schema.localization);
export type localizationType = InferSelectModel<typeof schema.localization>;
export type insertLocalizationType = InferInsertModel<
  typeof schema.localization
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
  localization: {
    schema: insertLocalizationSchema,
    update: insertLocalizationSchema.partial(),
    table: schema.localization,
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
