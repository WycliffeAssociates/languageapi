import {app} from "@azure/functions";
import {routes} from "../routes";
import {externalRouteType} from "../customTypes/types";
import {getDb as startDb} from "../db/config";
startDb();

routes.forEach((route: externalRouteType) => {
  app.http(route.name, {...route.details});
});
