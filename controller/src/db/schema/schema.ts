import {
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  smallint,
  json,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";
import {
  langDirectionsEnum,
  contentTypeEnum,
  contentDomainEnum,
} from "./constants";

// this fille only contains pgTable types. Relations and enums are a separate file.  This allows for getting all table names as a ts type by doing keyof typeof schmea (where import * as schema from this file) without having to exclude anything

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
