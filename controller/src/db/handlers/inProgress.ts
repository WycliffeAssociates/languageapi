// LANGUAGE TABLE
// async function upsertLanguage(lang: validations.insertLanguage) {
//   try {
//     const parsedLang = validations.insertLanguageSchema.parse(lang);

//     const langInsert = await db
//       .insert(schema.language)
//       .values(parsedLang)
//       .onConflictDoUpdate({
//         target: schema.language.ietfCode,
//         set: parsedLang,
//       })
//       .returning({inserted: schema.language.ietfCode});

//     return langInsert;
//     //   await db.insert(users)
//     // .values({ id: 1, name: 'John' })
//     // .onConflictDoNothing();
//   } catch (error) {
//     console.error(error);
//   }
// }
// async function deleteLanguage(ietf: string) {
//   const lang = schema.language;
//   const deletedUser = await db
//     .delete(lang)
//     .where(eq(lang.ietfCode, ietf))
//     .returning();
//   return deletedUser;
// }

// LANG ALT NAMES
// async function upsertLanguageAlternateNames(
//   lang: validations.insertLanguageAlternateName
// ) {
//   const dbTable = schema.languageAlternateName;
//   const validator = validations.insertLanguageAlternateNameSchema;
//   try {
//     const parsed = validator.parse(lang);
//     const langInsert = await db
//       .insert(dbTable)
//       .values(parsed)
//       .onConflictDoUpdate({
//         target: dbTable.languageIetfCode,
//         set: parsed,
//       })
//       .returning({inserted: schema.language.ietfCode});
//     return langInsert;
//   } catch (error) {
//     console.error(error);
//   }
// }

// LANG 2 LANG
// async function upsertLanguageToLanguage(
//   lang: validations.insertLanguagesToLanguages
// ) {
//   const dbTable = schema.languagesToLanguages;
//   const validator = validations.insertLanguagesToLanguagesSchema;
//   try {
//     const parsed = validator.parse(lang);
//     const langInsert = await db
//       .insert(dbTable)
//       .values(parsed)
//       .onConflictDoUpdate({
//         target: dbTable.id,
//         set: parsed,
//       })
//       .returning({inserted: schema.language.ietfCode});
//     return langInsert;
//   } catch (error) {
//     console.error(error);
//   }
// }

// DOMAIN TABLE
// async function upsertDomain(content: validations.insertDomain) {
//   const dbTable = schema.domain;
//   const validator = validations.insertDomainSchema;
//   try {
//     const parsed = validator.parse(content);
//     const langInsert = await db
//       .insert(dbTable)
//       .values(parsed)
//       .onConflictDoUpdate({
//         target: dbTable.id,
//         set: parsed,
//       })
//       .returning();
//     return langInsert;
//   } catch (error) {
//     console.error(error);
//   }
// }

// CONTENT TABLE
// async function upsertContent(content: validations.insertContent) {
//   const dbTable = schema.content;
//   const validator = validations.insertContentSchema;
//   try {
//     const parsed = validator.parse(content);
//     const namespacedId = `${parsed.namespace}-${parsed.id}`;
//     parsed.id = namespacedId;
//     const langInsert = await db
//       .insert(dbTable)
//       .values(parsed)
//       .onConflictDoUpdate({
//         target: dbTable.id,
//         set: parsed,
//       })
//       .returning({inserted: dbTable.id});
//     return langInsert;
//   } catch (error) {
//     console.error(error);
//   }
// }

//CONNECTED CONTENT
// CONTENT TABLE
// async function insertConnectedContent(
//   content: validations.insertConnectedContent
// ) {
//   const dbTable = schema.connectedContent;
//   const validator = validations.insertConnectedContentSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// GIT REPO
// async function upsertGitRepo(content: validations.insertGitRepo) {
//   const dbTable = schema.gitRepo;
//   const validator = validations.insertGitRepoSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db
//       .insert(dbTable)
//       .values(parsed)
//       .onConflictDoUpdate({
//         target: dbTable.id,
//         set: parsed,
//       })
//       .returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// CONTEXT
// async function upsertContext(content: validations.insertContext) {
//   const dbTable = schema.context;
//   const validator = validations.insertContextSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db
//       .insert(dbTable)
//       .values(parsed)
//       .onConflictDoUpdate({
//         target: dbTable.id,
//         set: parsed,
//       })
//       .returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// CONTENT_TO_CONTEXT
// async function insertContentToContext(content: validations.insertContext) {
//   const dbTable = schema.contentToContext;
//   const validator = validations.insertContentToContextSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db
//       .insert(dbTable)
//       .values(parsed)
//       // .onConflictDoUpdate({
//       //   target: [dbTable.contentId, dbTable.contextId],
//       //   set: parsed,
//       // })
//       .returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertFileType(content: validations.insertFileType) {
//   const dbTable = schema.fileType;
//   const validator = validations.insertFileTypeSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertRendering(content: validations.insertRendering) {
//   const dbTable = schema.rendering;
//   const validator = validations.insertRenderingSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertSripturalRenderingMetadata(
//   content: validations.insertScripturalRenderingMetadata
// ) {
//   const dbTable = schema.scripturalRenderingMetadata;
//   const validator = validations.insertScripturalRenderingMetadataSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertNonSripturalRenderingMetadata(
//   content: validations.insertScripturalRenderingMetadata
// ) {
//   const dbTable = schema.nonScripturalRenderingMetadata;
//   const validator = validations.insertNonScripturalRenderingMetadataSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertWorldRegion(
//   content: validations.insertScripturalRenderingMetadata
// ) {
//   const dbTable = schema.worldRegion;
//   const validator = validations.insertWorldRegionSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertCountry(content: validations.insertCountry) {
//   const dbTable = schema.country;
//   const validator = validations.insertCountrySchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertCountryToLanguage(content: unknown) {
//   const dbTable = schema.countryToLanguage;
//   const validator = validations.insertCountryToLanguageSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertProvince(content: unknown) {
//   const dbTable = schema.province;
//   const validator = validations.insertProvinceSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }

// async function insertCountryRegion(content: unknown) {
//   const dbTable = schema.countryRegion;
//   const validator = validations.insertCountryRegionSchema;
//   try {
//     const parsed = validator.parse(content);
//     const retVal = await db.insert(dbTable).values(parsed).returning();
//     return retVal;
//   } catch (error) {
//     console.error(error);
//   }
// }
