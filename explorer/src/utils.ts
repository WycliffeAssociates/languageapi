import {print, parse} from "graphql";

export function getPresets() {
  const link = process.env.REACT_APP_HASURA_URL!;
  let defaultUrl =
    new URLSearchParams(window.location.search).get("endpoint") || link;
  let rawQuery = new URLSearchParams(window.location.search).get("query") || "";
  let queryFile =
    new URLSearchParams(window.location.search).get("query_file") || null;
  let defaultQuery;

  try {
    defaultQuery = print(parse(rawQuery));
  } catch (e) {
    defaultQuery = rawQuery;
  }

  let defaultVariables =
    new URLSearchParams(window.location.search).get("variables") || "";
  let headersFromParams = Object.fromEntries(
    new URLSearchParams(window.location.search)
      .getAll("header")
      .map((e) => e.split(":"))
  );

  let defaultHeaders = Object.keys(headersFromParams).length
    ? headersFromParams
    : {};
  if (
    !Object.keys(defaultHeaders).find((k) => k.toLowerCase() === "content-type")
  )
    defaultHeaders["content-type"] = "application/json";

  return {
    defaultHeaders,
    defaultQuery,
    defaultUrl,
    defaultVariables,
    queryFile,
  };
}

export function updateLocation(endpointInput: string) {
  let urlParams = new URLSearchParams(window.location.search);
  urlParams.set("endpoint", endpointInput);
  let updatedUrl =
    window.location.origin +
    window.location.pathname +
    "?" +
    urlParams.toString();
  window.history.replaceState({}, " ", updatedUrl);
}

export function goTo(url: string, newTab = false) {
  if (newTab) window.open(url, "__blank");
  else window.location.href = url;
}

export const githubDemo =
  "/public/graphiql?header=content-type:application/json&header=Authorization:bearer <enter your token here>&endpoint=https://api.github.com/graphql";

export const spaceXDemo =
  "/public/graphiql?header=content-type:application/json&endpoint=https://api.spacex.land/graphql";

export const graphqlJobsDemo =
  "/public/graphiql?header=content-type:application/json&endpoint=https://api.graphql.jobs";
