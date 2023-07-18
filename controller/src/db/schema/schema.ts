import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  smallint,
  json,
  index,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";
import {
  langDirectionsEnum,
  contentTypeEnum,
  contentDomainEnum,
} from "./constants";
// const langDirectionsEnum = pgEnum("direction", ["ltr", "rtl"]);
// this fille only contains pgTable types. Relations and enums are separate.  This allows for getting all table names as a ts type by doing keyof typeof schmea (where import * as schema from this file) without having to exclude anything

//@=============== LANGUAGE  =============
export const language = pgTable(
  "language",
  {
    id: varchar("id").primaryKey().notNull(),
    ietfCode: varchar("ietf_code").notNull(),
    nationalName: text("national_name").notNull(),
    englishName: text("english_name").notNull(),
    direction: langDirectionsEnum("direction").notNull(),
    iso6393: varchar("iso6393"),
    createdOn: timestamp("created_on", {mode: "string"}),
    modifiedOn: timestamp("modified_on", {
      mode: "string",
      precision: 0,
      withTimezone: false,
    }),
    isOralLanguage: boolean("is_oral_language"),
    homeCountryAlpha2: varchar("home_country_alpha2")
      .references(() => country.alpha2)
      .notNull(),
  },
  (language) => {
    return {
      ietfIdx: uniqueIndex("ietf_idx").on(language.ietfCode),
      id: uniqueIndex("id_idx").on(language.id),
    };
  }
);
//@=============== WA LANG META  =============
export const waLangMetadata = pgTable("wa_language_meta", {
  id: serial("id").primaryKey(),
  ietfCode: varchar("ietf_code")
    .references(() => language.ietfCode, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  showOnBiel: boolean("show_on_biel").notNull(),
});
// JOIN ON COUNTRY ALPHA 2 AS UNIQUE INDEX.

// add id from port id
// oral lang (bool)
// oral lang name bool
// show on Biel (for langs) ( which means another pivot table for context / lang), Biel_opt_in

// None were going to actually be stored in db.
// biel trifecta:
// language show on biel,
// repo: biel_opt_in,
// repo: statuscode == primary,
//Maybe should just store this stuff in Hasura, not make it public, and make sure the anonymous select query isn't returning ones where showBiel is false... But then ROW does want to see them all as needed so?

// Indonesian -> ok that exists -> not ok to show on biel
// DangerousLang -> Ok that exists -> not ok cause we don't want people to know we are making scripture in this language.

// Lang -> show on biel
// repo -> biel opt in
//  statuscode -> primary

// biel query all langs where showOnBiel = true
//A biel query all content join lang where lang show on Biel = true and content.biel_opt = true && content.statuscode = true
//B biel query all content where lang code = "$ietf"

// options: (no order)
// 1. query pivot table + (context<==>contnet) ad hoc logic based on port data
// You'd also have to set up same thing for language
// 2. Just put it all in the api, expose it, and query it (security?)
// 3. Put in db, don't expose the field to anonymous users via hasura, and write some middleware in hasura?
// 4. wa-metadata-tables for lang and content

// Country:
// alpha2 = 2 letter code
// alpha3 = 3 letter code
// country ids = dynamics hex
//

// translation repo
// ->

/* 
PORT MEETING
*/
/* 
At what level is their change detection in PORT? countries? on languages?


pass along langNamesJson key from original. 
select max PK from languagen to increment new non-existtent port pk row.


ID: ?
serial id, ietf, port_id = unique, 
primary key should never be semantic that has possibility to change


add'l field in port: 
home country
alternative names




country:
name, code, region, port id, population?
*/
//@=============== LANG ALT  =============
export const languageAlternateName = pgTable(
  "language_alternate_name",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    languageIetfCode: varchar("ietf_code")
      .references(() => language.ietfCode, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => {
    return {
      nameIetfIdx: uniqueIndex("name_ietf_idx").on(
        table.name,
        table.languageIetfCode
      ),
    };
  }
);
//@=============== LANG TO LANG PIVOT   =============
export const languagesToLanguages = pgTable(
  "languages_to_languages",
  {
    gatewayLanguageId: varchar("gateway_language_ietf")
      .references(() => language.ietfCode, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    gatewayLanguageToId: varchar("gateway_language_to_ietf")
      .references(() => language.ietfCode, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => {
    return {
      primaryKey: primaryKey(
        table.gatewayLanguageId,
        table.gatewayLanguageToId
      ),
    };
  }
);
//@=============== CONTENT TYPE LOOKUP  =============
// export const contentType = pgTable("content_type", {
//   id: serial("id").primaryKey(),
//   contentType: varchar("content_type", {
//     enum: ["text", "audio", "video", "braille"],
//   }).notNull(),
// });
//@=============== Domain type lookupg  =============
// export const domain = pgTable("domain", {
//   id: serial("id").primaryKey(),
//   domain: varchar("domain", {
//     enum: ["scripture", "gloss", "parascriptural", "peripheral"],
//   }).notNull(),
// });
// Biel opt in as part of zod validation but not table?
// Id's are namespaced via zod and but be provided by connectors
//@=============== CONTENT Table  =============
export const content = pgTable("content", {
  id: varchar("id", {length: 256}).primaryKey().notNull(),
  languageId: varchar("language_id").references(() => language.ietfCode),
  name: varchar("name", {length: 256}),
  type: contentTypeEnum("type").notNull(),
  domain: contentDomainEnum("domain"),
  resourceType: text("resource_type"), //tw, tn, lexicon, ideally something standard though
  gitId: integer("git_id"),
  createdOn: timestamp("created_on", {mode: "string"}),
  modifiedOn: timestamp("modified_on", {mode: "string"}),
  level: varchar("level"),
});

//@=============== WA content meta  =============
export const waContentMetadata = pgTable(
  "wa_content_meta",
  {
    id: serial("id").primaryKey(),
    contentId: varchar("content_id", {length: 256})
      .references(() => content.id, {onDelete: "cascade", onUpdate: "cascade"})
      .notNull(),
    showOnBiel: boolean("show_on_biel").notNull(),
    status: varchar("status").notNull(),
  },
  (table) => {
    return {
      contentIdx: uniqueIndex("content_idx").on(table.contentId),
    };
  }
);

//@=============== DIRECTLY CONNECTED CONTENT  =============
export const connectedContent = pgTable(
  "connected_content",
  {
    contentId1: varchar("content_id_1", {length: 256})
      .references(() => content.id, {onDelete: "cascade", onUpdate: "cascade"})
      .notNull(),
    contentId2: varchar("content_id_2", {length: 256})
      .references(() => content.id, {onDelete: "cascade", onUpdate: "cascade"})
      .notNull(),
  },
  (table) => ({
    primaryKey: primaryKey(table.contentId1, table.contentId2),
  })
);
//@=============== GIT REPO  =============
export const gitRepo = pgTable(
  "git_repo",
  {
    id: serial("id").primaryKey(),
    contentId: varchar("content_id")
      .references(() => content.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    username: varchar("username").notNull(), //drizzle orm currently doesn't support unique constraints outside of indexes.
    repoName: varchar("repo_name").notNull(),
    repoUrl: varchar("repo_url").notNull(),
  },
  (repo) => {
    return {
      urlIdx: uniqueIndex("username_reponame_idx").on(
        repo.username,
        repo.repoName
      ),
      contentIdIdx: uniqueIndex("content_id_idx").on(repo.contentId),
    };
  }
);
//@=============== FILE TYPE LOOKUP  =============
// IDEALLY A UNIQUE CONSTRAINT HERE and not unique index WHEN DRIZZLE SUPPORTS IT
// export const fileType = pgTable(
//   "file_type",
//   {
//     id: serial("id").primaryKey(),
//     fileType: varchar("file_type").notNull(),
//   },
//   (table) => {
//     return {
//       typeIdx: uniqueIndex("type_idx").on(table.fileType),
//     };
//   }
// );
//@=============== RENDERING OR LINK TABLE  =============
export const rendering = pgTable(
  "rendering",
  {
    id: serial("id").primaryKey(),
    contentId: varchar("content_id")
      .references(() => content.id, {onDelete: "cascade", onUpdate: "cascade"})
      .notNull(),
    fileType: varchar("file_type").notNull(),
    fileSizeBytes: bigint("file_size_bytes", {mode: "number"}),
    url: text("url").notNull(),
    doesCoverAllContent: boolean("does_cover_all_content").notNull(),
    createdAt: timestamp("created_at", {mode: "string"}),
    modifiedOn: timestamp("modified_on", {mode: "string"}).defaultNow(),
  },
  (table) => {
    return {
      urlIdx: uniqueIndex("rendering_unique_idx").on(table.url),
    };
  }
);
//@=============== RENDERING META  =============
export const scripturalRenderingMetadata = pgTable(
  "scriptural_rendering_metadata",
  {
    id: serial("id").primaryKey(),
    renderingId: serial("rendering_id")
      .references(() => rendering.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    bookSlug: varchar("book_slug", {length: 64}).notNull(), //zod stores these as exclusively uppercase
    bookName: varchar("book_name").notNull(),
    chapter: integer("chapter").notNull(), //-1 = all chapters.
    sort: smallint("sort"),
  }
);
//@=============== NON SCRIPTURE RENDER META  =============
export const nonScripturalRenderingMetadata = pgTable(
  "nonscriptural_rendering_metadata",
  {
    id: serial("id").primaryKey(),
    renderingId: serial("rendering_id")
      .references(() => rendering.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    name: varchar("name", {length: 256}),
    additionalData: json("additional_data"),
  }
);
//@=============== REGION TABLE  =============
export const worldRegion = pgTable(
  "world_region",
  {
    id: serial("id").primaryKey(),
    name: text("region").notNull(),
    createdOn: timestamp("created_on", {mode: "string"}),
    modifiedOn: timestamp("modified_on", {mode: "string"}),
  },
  (table) => {
    return {
      regionNameIdx: uniqueIndex("region_name_idx").on(table.name),
    };
  }
);
//@=============== COUNTRY =============
export const country = pgTable(
  "country",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    worldRegionId: serial("world_region_id").references(() => worldRegion.id),
    createdOn: timestamp("created_on", {mode: "string"}),
    modifiedOn: timestamp("modified_on", {mode: "string"}),
    alpha2: varchar("alpha_2").notNull(),
    alpha3: varchar("alpha_3"),
    population: integer("population"),
  },
  (table) => {
    return {
      alpha2Idx: uniqueIndex("alpha_2_idx").on(table.alpha2),
    };
  }
);
// many-many
//@=============== COUNTYR LANGUAGE PIVOT  =============
export const countryToLanguage = pgTable(
  "country_to_language",
  {
    languageIetf: varchar("language_ietf_code")
      .references(() => language.ietfCode, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    countryAlpha: varchar("country_alpha_2")
      .references(() => country.alpha2, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => {
    return {
      primaryKey: primaryKey(table.languageIetf, table.countryAlpha),
    };
  }
);

// export const countryRegion = pgTable("country_region", {
//   id: serial("id").primaryKey(),
//   name: text("name").notNull(),
//   country_id: serial("country_id")
//     .references(() => country.id)
//     .notNull(),
// });

// For inserting to
