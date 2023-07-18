import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
// import {countryRoute} from "../routes/test";
import {routes} from "../routes";
import {externalRouteType} from "../customTypes/types";
import {getDb as startDb} from "../db/config";
startDb();

routes.forEach((route: externalRouteType) => {
  app.http(route.name, {...route.details});
});

// tables to write routes for
// langauge
//--- waLangMeta
// ---langAltName
// ---langToLang (need to do)
// ---countryToLanguage

// country
// --countryToLanguage (also inserts from this side)

// content
// waContentMetadata
// --csv status
// --csv optInBiel

// worldRegion

//=== rendering pipeline and other connectors (e.g) non port things
// connectedContent
// gitRepo
// fileType
// rendering
// scripturalRenderingMetadata
// nonScripturalRenderingMetadata
