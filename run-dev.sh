#!/bin/bash

pg_dump $(op read "op://AppDev Scripture Accessibility/languageapi-dev/connection string") -n public -n drizzle > data_dump.sql

export BUS_CONN=$(op read "op://AppDev Scripture Accessibility/languageapi-dev/connection string")

docker compose up -d