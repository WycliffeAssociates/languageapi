.PHONY: console
console:
	hasura console \
	--admin-secret $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/hasura-graphql-admin-secret") \
	--endpoint $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/url")

# -n drizzle schema is for to get the same migrations that have been applied to the dev database applied. 
.PHONY: datadump
datadump:
	pg_dump $(op read "op://AppDev Scripture Accessibility/languageapi-dev/connection string") -n public -n drizzle --data-only > data_dump.sql

# Note, this will conflict if you're running postgres on own machine on default port too. 
.PHONY: localdataingest
localdataingest:
	psql postgres://docker:docker@localhost:5432/docker -f data_dump.sql

.PHONY: run
run:
	docker compose build && docker compose up

.PHONY: build
build:
	docker compose build

.PHONY: clean
clean:
	docker compose down -v