.PHONY: console
console:
	hasura console \
	--admin-secret $$(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/hasura-graphql-admin-secret") \
	--endpoint $$(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/url")

# -n drizzle schema is for to get the same migrations that have been applied to the dev database applied. This presumes a workflow of dumping dev data incl. it's migrations, and then trying out new stuff from there. When the docker compose postgres volume spins ups, its uses psql and mounts in this dump. 
# If you're resetting local back to dev parity, docker
.PHONY: datadump
datadump:
	pg_dump "$$(op read "op://AppDev Scripture Accessibility/languageapi-dev/connection string")" -n public -n drizzle > data_dump.sql

# Note, this will conflict if you're running postgres on own machine on 5432 default port too. If so, stop that postgres service so that you can run this against the one in the container
.PHONY: localdataingest
localdataingest:
	psql postgres://docker:docker@localhost:5432/docker -f data_dump.sql

#Run any test migrations against your local instance. again, will conflict if running a local postgres since aimed a container's bounds 5432.
.PHONY: migrate
migrate:
	pushd controller && pnpm run migrate && popd

.PHONY: run
run:
	docker compose build && docker compose up

.PHONY: build
build:
	docker compose build

.PHONY: clean
clean:
	docker compose down -v

.PHONY: hasura-meta
hasura-meta:
	pushd hasura && rm -rf metadata && hasura metadata export && popd
# .PHONY: hasura-migrate
# hasura-migrate:
# 	hasura migrate apply