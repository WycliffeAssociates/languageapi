type exampleType = {
  slug: string;
  title: string;
  code: string;
  link?: string;
  notes?: string;
};

const allLangs: exampleType = {
  slug: "all-langs",
  title: "How Do I get all languages?",
  code: `query MyQuery {
    language {
      id
      ietf_code
      is_oral_language
      iso6393
      national_name
    }
  }`,
};

const contentForLang: exampleType = {
  slug: "content-for-lang",
  title: "How Do I get content for a language?",
  code: `query MyQuery {
    content(where: { language_id: { _eq: am } }) {
      id
      language_id
      level
      name
      namespace
      resource_type
      created_on
      modified_on
      domain
      type
    }
  }`,
};
const contentOfficialForLang: exampleType = {
  slug: "content-official-for-lang",
  title: "How Do I get WA primary content for a language?",
  code: `query MyQuery {
    wa_content_metadata(where: { language_id: { _eq: am } }) {
      id
      language_id
      level
      name
      namespace
      resource_type
      created_on
      modified_on
      domain
      type
    }
  }`,
  link: "https://api-explorer-dev.walink.org/?query=query+MyQuery+%7B%0A++content%28%0A++++where%3A+%7Blanguage_id%3A+%7B_eq%3A+%22am%22%7D%2C+_and%3A+%7Bgit_repo%3A+%7Busername%3A+%7B_ilike%3A+%22WA-Catalog%22%7D%7D%7D%7D%0A++%29+%7B%0A++++id%0A++++language_id%0A++++name%0A++++namespace%0A++++resource_type%0A++++git_repo+%7B%0A++++++username%0A++++%7D%0A++%7D%0A%7D",
};

export const contentByChapter: exampleType = {
  slug: "content-by-chapter",
  title:
    "How Do I get content for a scripture project by chapter in a specific file format?",
  code: `query MyQuery {
  content(where: {name:{_eq:"wa-catalog/en_ulb"} namespace:{_eq:"wacs"}}) {
    id
    type
    name
    namespace
    rendered_contents(where:{file_type:{_eq:"html"}}) {
      url
      hash
      scriptural_rendering_metadata {
        chapter
      }
    }    
  }
}`,
  link: `https://api-explorer-dev.walink.org/?query=query+MyQuery+%7B%0A++content%28where%3A+%7Bname%3A%7B_eq%3A%22wa-catalog%2Fen_ulb%22%7D+namespace%3A%7B_eq%3A%22wacs%22%7D%7D%29+%7B%0A++++id%0A++++type%0A++++name%0A++++namespace%0A++++rendered_contents%28where%3A%7Bfile_type%3A%7B_eq%3A%22html%22%7D%7D%29+%7B%0A++++++url%0A++++++scriptural_rendering_metadata+%7B%0A++++++++chapter%0A++++++%7D%0A++++%7D++++%0A++%7D%0A%7D`,
  notes: `There's more than one way of course to narrow down the project you're looking for.  You can query for just id's and then use those in a by _pk search or in your where clause.  For content, you might want to go by pk, by name/namespace (unique constraint), or by username/repoName from the git table (unique constraint)`,
};

export const aliasedExample: exampleType = {
  slug: "aliased-example",
  title: "Can I alias my query for a smaller payload on duplicated keys?",
  code: `
  query MyQuery {
  content(where: {name:{_eq:"wa-catalog/en_ulb"} namespace:{_eq:"wacs"}}) {
    id
    type
    name
    ns:namespace
    rc:rendered_contents(where:{file_type:{_eq:"html"}}) {
      url
      hash
      srm:scriptural_rendering_metadata {
        c:chapter
      }
    }    
  }
}`,
  notes:
    "Same query as before, but compare payload size to see what aliasing can do for large lists",
  link: "https://api-explorer-dev.walink.org/?query=query+MyQuery+%7B%0A++content%28where%3A+%7Bname%3A%7B_eq%3A%22wa-catalog%2Fen_ulb%22%7D+namespace%3A%7B_eq%3A%22wacs%22%7D%7D%29+%7B%0A++++id%0A++++type%0A++++name%0A++++ns%3Anamespace%0A++++rc%3Arendered_contents%28where%3A%7Bfile_type%3A%7B_eq%3A%22html%22%7D%7D%29+%7B%0A++++++url%0A++++++hash%0A++++++srm%3Ascriptural_rendering_metadata+%7B%0A++++++++c%3Achapter%0A++++++%7D%0A++++%7D++++%0A++%7D%0A%7D",
};

export const sourceZip: exampleType = {
  slug: "source-zip",
  title: "What if I just want the zipped resource container or burrito?",
  code: `query MyQuery {
  source_zips(where: {id:{_eq:"cj9l3jykorbufik4kgvv8h0b"}}) {
    domain
    language_name
    repo_url
    zip_url
    ietf_code
    name
    namespace
    id
  }
}`,
  link: "https://api-explorer.bibleineverylanguage.org/?query=query+MyQuery+%7B%0A++source_zips%28where%3A+%7Bid%3A%7B_eq%3A%22cj9l3jykorbufik4kgvv8h0b%22%7D%7D%29+%7B%0A++++domain%0A++++language_name%0A++++repo_url%0A++++zip_url%0A++++ietf_code%0A++++name%0A++++namespace%0A++++id%0A++%7D%0A%7D",
};
const withProdLink = [
  allLangs,
  contentForLang,
  contentOfficialForLang,
  contentByChapter,
  aliasedExample,
  sourceZip,
].map((e) => {
  if (e.link) {
    e.link.replace(
      "https://api-explorer-dev.walink.org",
      "https://api-explorer.bibleineverylanguage.org/"
    );
  }
  return e;
});
export default withProdLink;
