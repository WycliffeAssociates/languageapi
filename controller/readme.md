# Gql controller

*Code to manage several crud ops on db.*

## Architecture at a glance: 
src/db/schema
- /schema - defines the actual db schema using drizzle (orm)[https://orm.drizzle.team/docs/quick-start].  constants holds enums in a separate file. (separate file so that schema only contains tables as a personal convention)
- /relations - a drizzle orm only thing. Does not enforce relations as fks. Used for type intellisense. 
- validations - uses drizzle zod to declare and rexport types and zod schemas as a base layer for validations (some schemas are further extended in routes/validations/index)

src/db/handlers
- index - an abstraction that extends type safety around drizzle crud operations for convenience and to type safe pass tables and payloads generically.

src/db/handlers
- config.ts -> getter to acquire db handle

src/docs
- open api docs v2 and v3 are genereated by the openApi.ts file along with some node deps.

src/functions
- app.ts - entry point to azure function

src/routes
- index - a barrel to export the az. function routes
- (fileName) - each file corresponds to a api route.
  
src/routes/validation
- These are extensions to the db/zod schemas that extend the bare table level schemas.  Some routes (e.g) language insert on several tables at once, so the schema for the aggregation of payloads for an api route is handled here.  These are exported and consumed in openApi and in the getMocks.ts file to generate mock data and build the schema. 
  

src/migrate
- migration script for ci or to run as needed

## Running the project:
- While the azure function can be run inside the container if you just docker compose up, current reccomendation is pnpm i the deps, and then run pnpm run watch in one terminal and pnpm run start in another.  Changes are compiled with watch, adn code in dist is update during dev, avoiding having to mount in src code as volume in docker for fast refresh.  Running it locally as an azure fxn does require the local.settings.json for the appropriate env vars since they aren't set through the docker container. 