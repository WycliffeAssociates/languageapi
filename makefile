.PHONY: console
console:
	hasura console \
	--project ./hasura \
	--admin-secret $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/hasura-graphql-admin-secret") \
	--endpoint $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/url")

.PHONY: metadata-apply
metadata-apply:
	hasura metadata apply \
	--project ./hasura \
	--admin-secret $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/hasura-graphql-admin-secret") \
	--endpoint $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/url")

.PHONY: datadump
datadump:
	pg_dump -d $(op read "op://AppDev Scripture Accessibility/languageapi-dev/connection string") -n public -n drizzle --data-only > data_dump.sql

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