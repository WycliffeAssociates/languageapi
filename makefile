.PHONY: console datadump


console:
	hasura console \
	--admin-secret $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/hasura-graphql-admin-secret") \
	--endpoint $(op read "op://AppDev Scripture Accessibility/languageapi-hasura-dev-container-secrets/url")

datadump:
	pg_dump -d $(op read "op://AppDev Scripture Accessibility/languageapi-dev/connection string") -n public --data-only > data_dump.sql
