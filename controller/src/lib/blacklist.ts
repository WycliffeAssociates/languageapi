export function doBlackListLangauge(lang: {
  ietfCode: string;
  englishName: string;
}) {
  const unknownIetfRegex = /UNK\d{3}/i;
  const hasNameFrontier = lang.englishName
    .toLowerCase()
    .includes("New Frontier");

  return unknownIetfRegex.test(lang.ietfCode) || hasNameFrontier;
}
