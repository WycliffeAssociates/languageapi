import {z} from "zod";
import * as dbValidators from "../../db/schema/validations";

// validations in DB folder are only tied to the the schema model.  But api requests may take some additional data that isn't getting stored on the model or are for reshaping, or is wrapping it in an array etc, so these extends those validations as needed.

/* //@===============  LANGUAGE=============   */
export const langPost = z.array(
  dbValidators.insertLanguageSchema.extend({
    allCountryAlpha2: z.array(z.string()).optional(),
    alternateNames: z.array(z.string()).optional(),
    waLangMeta: z
      .object({
        showOnBiel: z.boolean(),
      })
      .optional(),
    gatewayIetf: z.string().trim().optional(),
  })
);
export const langDelete = z.object({ietfCodes: z.array(z.string())});
export const postLangToCountryMany = z.array(
  dbValidators.insertCountryToLanguageSchema
);
export const postLangAltNamesMany = z
  .array(dbValidators.insertLanguageAlternateNameSchema)
  .optional();
/* //@===============  COUNTRY   =============   */
export const countryPost = z.array(
  dbValidators.insertCountrySchema
    .extend({
      regionName: z.string().trim(),
    })
    .omit({worldRegionId: true})
);
export const countryDelete = z.object({
  alpha2Codes: z.array(z.string()),
});

/* //@===============  REGIONS   =============   */
export const regionPost = z.array(dbValidators.insertWorldRegionSchema);
export const regionDelete = z.object({
  regionNames: z.array(z.string()),
});

/* //@===============  Git   =============   */

export const gitPost = z.array(
  dbValidators.insertGitRepoSchema.extend({
    namespace: z.string().trim().toLowerCase(),
  })
);
export const gitDelete = z.object({
  userRepo: z.array(
    z.object({
      username: z.string(),
      repo: z.string(),
    })
  ),
});

/* //@===============  CONTENT   =============   */

export const contentPost = z.array(
  dbValidators.insertContentSchema
    .omit({
      gitId: true, //derived from gitEntry if present
    })
    .extend({
      namespace: z.string().trim().toLowerCase(),
      meta: dbValidators.insertWaContentMetaSchema
        .omit({contentId: true})
        .optional(),
      resourceType: z.nullable(z.string().trim().toLowerCase()).optional(),
      gitEntry: gitPost.element
        .omit({
          contentId: true, //will grab from insert
        })
        .optional(),
    })
);
export const contentDelete = z.object({
  ids: z.array(z.string()),
});

/* //@===========  Renderings   ===========   */
const contentRenderingWithMeta = dbValidators.insertRenderingSchema.extend({
  fileType: z.string().trim().toLowerCase(),
  namespace: z.string().trim().toLowerCase(),
  scripturalMeta:
    dbValidators.insertScripturalRenderingMetadataSchema.optional(),
  nonScripturalMeta:
    dbValidators.insertNonScripturalRenderingMetadataSchema.optional(),
});
export const renderingsPost = z.array(contentRenderingWithMeta);
export type typeOfContentRenderingWithMeta = z.infer<
  typeof contentRenderingWithMeta
>;
export const renderingDelete = z.object({
  contentIds: z.array(
    z.object({
      namespace: z.string().trim().toLowerCase(),
      id: z.string(),
    })
  ),
});
