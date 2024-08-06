type overview = {
  slug: string;
  title: string;
  bodyHtml: string;
};

export const contentOverview: overview = {
  slug: "content",
  title: "Content",
  bodyHtml:
    "Content represents the idea of a <b>project</b> in the api. For exampl, the English ULB. Metadata about the content is on this table, such as to what domain (a scripture burrito concept) does the content belong (i.e. scripture, gloss, parascriptural, or peripheral). What is the type of content (audio | text, | video | braille). ",
};
export const waContentMetadata: overview = {
  slug: "wacontent_metadata",
  title: "WA Content Metadata",
  bodyHtml:
    "This table contains additional WA specific information to allow for additional categorization and filtering, but is not inherent to a project itself in the way that something like language is.",
};
export const language: overview = {
  slug: "language",
  title: "Language",
  bodyHtml:
    "Information about languages WA tracks. ietf_code has an index on it and is the most likely way you'll want to filter/search based on a language. There are additional tables supporting information from WA for <i>country, world region</i> and <i>language_alternate_name</i>",
};
export const gatewayLanguage: overview = {
  slug: "gateway_language",
  title: "Gateway Languages, Dependent Languages, and is_gateway",
  bodyHtml:
    "Languages may be connected by either being the language through which another language's materials might be of interest (I.e. Language A is a gateway to Language B), or the inverse is that Language 'B' might depend on Language 'A' for some useful material. Separately, the <b>is_gateway</b> field on the table wa_language_meta provides a single boolean flag to indicate specific languages of interest to WA in which materials are produced that can be used for broader consumption by other language families.",
};

export const gitRepo: overview = {
  slug: "git_repo",
  title: "Git Repos",
  bodyHtml:
    "Most 'content' is backed by a git repository in the WACS ecosystem.  This table is most likley to be queried as a connection or filter from Content to find content for a specific git user.  There is a unique constraint on username/reponame if you know you want to search based on that.",
};

export const renderedContent: overview = {
  slug: "rendered_content",
  title: "Rendered Content",
  bodyHtml:
    "Whereas <i>content</i> represents an abstraction, <b>rendered_content</b> represents an obtainable piece (or the whole) of that content in various formats. Records in this table will contain a url that point to the actual content itself.  For example, a content of 'en/ulb' may have rows in this table to represent where you could get chapter 1-50 of Genesis, the whole book of genesis, and perhaps the entire ulb in json, as html, or as a zip file. A hash is provided of the provided URL to provide helpful caching",
};

export const scripturalRenderingMetadata: overview = {
  slug: "scriptural_rendering_metadata",
  title: "Scriptural Rendering Metadata",
  bodyHtml:
    "This is a metadata table for renderings pertinent to bible specifically (i.e. book name, slug, which chapter of a bible, etc;)",
};

export const source_zips: overview = {
  slug: "source_zips",
  title: "Source Zips",
  bodyHtml:
    "This is a view for quickly access the entire zip file provided by the git backing for content curated by WA.  It has the info from teh content table, and provides a url to the zip which a client can use to get all the source material for official WA projects in a one go.",
};

export const viewLangnames: overview = {
  slug: "view-langnames",
  title: "VW Langnames",
  bodyHtml:
    "a view used for applications that depend upon langnames.json, though a flat file is available as needed too.",
};
export const localization: overview = {
  slug: "localization",
  title: "Localization",
  bodyHtml:
    "For client side applications, this table provides localization for resource types (i.e. Translations Notes -> Notas de Traduccíon) and  for scripture books in their native names (i.e. Matthew -> Mateo.  Currently a WIP for resource types. ",
};

const entities: overview[] = [
  language,
  gatewayLanguage,
  contentOverview,
  gitRepo,
  waContentMetadata,
  renderedContent,
  scripturalRenderingMetadata,
  source_zips,
  viewLangnames,
];
export default entities;
