export function doBlackListLangauge(lang: {
  ietfCode: string;
  englishName: string;
}) {
  const unknownIetfRegex = /UNK\d{3}/i;
  const hasNameFrontier = lang.englishName
    .toLowerCase()
    .includes("New Frontier");
  // BTT-W generates these next two as tmp type codes
  const hasQaa = lang.ietfCode.startsWith("qaa-x-");
  const ietfIsTemp = lang.ietfCode === "-x-";

  return (
    unknownIetfRegex.test(lang.ietfCode) ||
    hasNameFrontier ||
    hasQaa ||
    ietfIsTemp
  );
}
