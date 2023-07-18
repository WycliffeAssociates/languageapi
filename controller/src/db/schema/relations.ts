import {relations} from "drizzle-orm";
import * as db from "./schema";
import type Config from "drizzle-kit";

export const languageAlternateNameRelations = relations(
  db.languageAlternateName,
  ({many, one}) => ({
    alterateNames: one(db.language, {
      fields: [db.languageAlternateName.languageIetfCode],
      references: [db.language.ietfCode],
      relationName: "alterateNames",
    }),
  })
);

export const langToLangRelations = relations(
  db.languagesToLanguages,
  ({many, one}) => ({
    languageTo: one(db.language, {
      fields: [db.languagesToLanguages.gatewayLanguageToId],
      references: [db.language.ietfCode],
      relationName: "gatewayLanguageTo",
    }),
    languageFrom: one(db.language, {
      fields: [db.languagesToLanguages.gatewayLanguageId],
      references: [db.language.ietfCode],
      relationName: "isGatewayLanguageFor",
    }),
  })
);
export const languagesRelations = relations(db.language, ({many}) => ({
  gatewayLanguageTo: many(db.languagesToLanguages, {
    relationName: "gatewayLanguageTo",
  }),
  isGatewayLanguageFor: many(db.languagesToLanguages, {
    relationName: "isGatewayLanguageFor",
  }),
  alterateNames: many(db.languageAlternateName, {
    relationName: "alterateNames",
  }),
}));

export const langMetaRelations = relations(db.waLangMetadata, ({one}) => ({
  language: one(db.language, {
    fields: [db.waLangMetadata.ietfCode],
    references: [db.language.ietfCode],
  }),
}));
export const contentRelations = relations(db.content, ({one, many}) => ({
  renderings: many(db.rendering),
  gitRepo: one(db.gitRepo, {
    fields: [db.content.gitId],
    references: [db.gitRepo.id],
  }),
}));

export const contentMetaRelations = relations(
  db.waContentMetadata,
  ({one}) => ({
    content: one(db.content, {
      fields: [db.waContentMetadata.contentId],
      references: [db.content.id],
    }),
  })
);

export const connectedContentRelations = relations(
  db.connectedContent,
  ({one}) => ({
    content1: one(db.content, {
      fields: [db.connectedContent.contentId1],
      references: [db.content.id],
    }),
    content2: one(db.content, {
      fields: [db.connectedContent.contentId2],
      references: [db.content.id],
    }),
  })
);
export const gitRepoRelations = relations(db.gitRepo, ({one}) => ({
  content: one(db.content, {
    fields: [db.gitRepo.contentId],
    references: [db.content.id],
  }),
}));

export const renderingRelations = relations(db.rendering, ({one}) => ({
  content: one(db.content, {
    fields: [db.rendering.contentId],
    references: [db.content.id],
  }),
}));

// export const countryRelations = relations(db.country, ({one, many}) => ({
//   province: many(db.province),
//   countryRegion: many(db.countryRegion),
// }));
export const worldRegionRelations = relations(
  db.worldRegion,
  ({one, many}) => ({
    countries: many(db.country),
  })
);
export const countryRelations = relations(db.country, ({one}) => ({
  region: one(db.worldRegion, {
    fields: [db.country.worldRegionId],
    references: [db.worldRegion.id],
  }),
}));
// export const provinceRelations = relations(db.province, ({one}) => ({
//   country: one(db.country, {
//     fields: [db.province.country_id],
//     references: [db.country.id],
//   }),
// }));
// export const countryRegionRelations = relations(db.countryRegion, ({one}) => ({
//   country: one(db.country, {
//     fields: [db.countryRegion.country_id],
//     references: [db.country.id],
//   }),
// }));
