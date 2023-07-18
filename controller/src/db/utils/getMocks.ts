import {faker} from "@faker-js/faker";
import * as apiValidators from "../../routes/validation";
import {z} from "zod";
let mocksToCopys: any = {
  language: [],
  country: [],
  region: [],
  content: [],
  git: [],
  renders: [],
};
for (let i = 0; i < 2; i++) {
  const mockedCountry = getMockedCountry();
  mocksToCopys.country.push(mockedCountry);
  //
  const mockLang = getMockedLang();
  mocksToCopys.language.push(mockLang);
  //
  const mockedRegion = getMockedRegion();
  mocksToCopys.region.push(mockedRegion);
  //
  const mockededContent = getMockedContent();
  mocksToCopys.content.push(mockededContent);
  //
  const mockedGit = getMockedGit();
  mocksToCopys.git.push(mockedGit);
  //
  const mockedRender = getMockedRendering();
  mocksToCopys.renders.push(mockedRender);
}
printMocksToConsole([
  {name: "lang", val: mocksToCopys.language},
  {name: "country", val: mocksToCopys.country},
  {name: "region", val: mocksToCopys.region},
  {name: "content", val: mocksToCopys.content},
  {name: "git", val: mocksToCopys.git},
  {name: "render", val: mocksToCopys.renders},
]);

export function getMockedLang() {
  type apiKeys = z.infer<typeof apiValidators.langPost.element>;

  const mockedLang: apiKeys = {
    id: faker.string.alpha(10),
    homeCountryAlpha2: faker.location.countryCode("alpha-2"),
    allCountryAlpha2: generateRandomArray(0, 6, () =>
      faker.location.countryCode("alpha-2")
    ),
    direction: faker.helpers.arrayElement(["ltr", "rtl"]),
    englishName: faker.word.words(1),
    ietfCode: faker.string.alpha({
      casing: "lower",
      length: 3,
    }),
    nationalName: faker.word.words(1),
    alternateNames: generateRandomArray(0, 10, fakerWord),
    createdOn: faker.date.anytime().toISOString(),
    iso6393: faker.string.alpha({
      casing: "lower",
      length: {
        min: 3,
        max: 10,
      },
    }),
    isOralLanguage: faker.datatype.boolean(),
    waLangMeta: {
      showOnBiel: faker.datatype.boolean(),
    },
  };
  // addTimestamps(mockedLang);
  return mockedLang;
}

export function getMockedCountry() {
  type apiKeys = Omit<z.infer<typeof apiValidators.countryPost.element>, "id">;
  const mockedCountryInsert: apiKeys = {
    name: faker.location.country(),
    // worldRegionId: faker.number.int({max: 6, min: 1}),
    createdOn: faker.date.anytime().toISOString(),
    modifiedOn: faker.date.anytime().toISOString(),
    alpha2: faker.location.countryCode("alpha-2"),
    alpha3: faker.location.countryCode("alpha-3"),
    population: faker.number.int({max: 2_000_000_000}),
    // languageIetf: faker.string.alpha({casing: "lower", length: 3}),
    regionName: faker.helpers.arrayElement([
      "Asia",
      "Africa",
      "North America",
      "South America",
      "Europe",
      "Austrailia",
    ]),
  };
  addTimestamps(mockedCountryInsert);
  return mockedCountryInsert;
}
export function getMockedGit() {
  type apiKeys = z.infer<typeof apiValidators.gitPost.element>;
  const mockedContent: apiKeys = {
    contentId: "wacs-user-repo",
    username: faker.internet.userName(),
    repoName: fakerWord(),
    repoUrl: faker.internet.url(),
  };
  return mockedContent;
}
export function getMockedContent() {
  type apiKeys = z.infer<typeof apiValidators.contentPost.element>;
  // type contentKeys = keyof typeof schema.content._.columns;
  // scripture" | "gloss" | "parascriptural" | "peripheral
  const fakeIdWord = faker.word.words(1);
  const mockedContent: apiKeys = {
    id: fakeIdWord,
    namespace: "wacs",
    domain: faker.helpers.arrayElement([
      "scripture",
      "gloss",
      "parascriptural",
      "peripheral",
    ]),
    createdOn: faker.date.anytime().toISOString(),
    modifiedOn: faker.date.anytime().toISOString(),
    // gitId: faker.helpers.maybe(() => faker.number.int({max: 1000, min: 1}), {
    //   probability: 0.5,
    // }),
    languageId: faker.string.alpha({casing: "lower", length: 3}),
    level: faker.helpers.arrayElement(["low", "medium", "high"]),
    name: faker.helpers.arrayElement([
      "ulb",
      "reg",
      "manual",
      "notes",
      "questions",
    ]),
    resourceType: faker.helpers.arrayElement([
      "tn",
      "tq",
      "tw",
      "tm",
      "ulb",
      "reg",
    ]),
    type: faker.helpers.arrayElement(["text", "audio", "video", "braille"]),
    meta: {
      showOnBiel: faker.datatype.boolean(),
      status: faker.helpers.arrayElement([
        "not approved",
        "approved",
        "official",
      ]),
    },
    gitEntry: faker.helpers.maybe(
      () => {
        return {
          username: faker.internet.userName(),
          repoName: fakerWord(),
          repoUrl: faker.internet.url(),
        };
      },
      {probability: 0.5}
    ),
  };
  // maybe: see if I can return this onlytruth val as an example? Maybe not. Probably easier to just demonstrate all the properties and denote the are options. But if wanted to return this right now ts complains about it. Maybe as a mapped type?
  const onlyTruthy = Object.fromEntries(
    Object.entries(mockedContent).filter(([_, value]) => !!value)
  );

  return mockedContent;
}
export function getMockedRegion() {
  type apiKeys = z.infer<typeof apiValidators.regionPost.element>;

  const mockedContent: apiKeys = {
    name: faker.helpers.arrayElement([
      "Asia",
      "Africa",
      "North America",
      "South America",
      "Europe",
      "Austrailia",
    ]),
    createdOn: faker.date.anytime().toISOString(),
    modifiedOn: faker.date.anytime().toISOString(),
  };
  return mockedContent;
}
export function getMockedRendering(
  type: "scripture" | "nonscripture" = "scripture"
) {
  type apiKeys = z.infer<typeof apiValidators.renderingsPost.element>;

  const mockedRender: apiKeys = {
    contentId: "user-repo",
    namespace: "wacs",
    doesCoverAllContent: faker.datatype.boolean(),
    fileType: faker.helpers.arrayElement([
      "html",
      "pdf",
      "zip",
      "web",
      "mp3",
      "mp4",
    ]),
    scripturalMeta: {
      bookName: "1 Jean",
      bookSlug: "1JN",
      chapter: faker.number.int({max: 5}),
    },

    url: faker.internet.url(),
    fileSizeBytes: faker.number.int(),
    createdAt: faker.date.anytime().toISOString(),
    modifiedOn: faker.date.anytime().toISOString(),
  };
  if (type == "scripture") {
    mockedRender.scripturalMeta = {
      bookName: "1 Jean",
      bookSlug: "1JN",
      chapter: faker.number.int({max: 5}),
    };
  } else {
    mockedRender.nonScripturalMeta = {
      name: "nonScripturalName",
      additionalData: "A json field",
    };
  }
  return mockedRender;
}
function printMocksToConsole(
  arr: {
    name: string;
    val: any;
  }[]
) {
  arr.forEach((item) => {
    console.log(`\n\n ${item.name}`);
    console.log(JSON.stringify(item.val));
  });
}
// UTILS

function addTimestamps(obj: Record<string, any>) {
  obj.createdOn = faker.date.anytime().toISOString();
  obj.modifiedOn = faker.date.anytime().toISOString();
}

function fakerWord() {
  return faker.word.words(1);
}
function generateRandomArray<T>(
  minSize: number,
  maxSize: number,
  populateFn: () => T
): T[] {
  const length = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
  const arr: T[] = [];
  for (let i = 0; i < length; i++) {
    arr.push(populateFn());
  }
  return arr;
}
