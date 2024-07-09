# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:4-node16-appservice
FROM mcr.microsoft.com/azure-functions/node:4-node18
COPY .dockerignore .

RUN corepack enable
RUN corepack prepare pnpm@8.14.0 --activate
# RUN corepack prepare yarn@4.0.2 --activate

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

WORKDIR /home/site/wwwroot
ENV PNPM_HOME=/usr/local/bin

COPY ./package.json /home/site/wwwroot
RUN pnpm install
RUN pnpm add --global azure-functions-core-tools@^4.0.5455
COPY . .
# I have no clue why, but when I included azure core tools as part of the controller dependencies using the core tools node package, the func command reliably broke, but not when installed globally
# Enable `pnpm add --global` on Alpine Linux by setting
# home location environment variable to a location already in $PATH
# https://github.com/pnpm/pnpm/issues/784#issuecomment-1518582235



RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*


ARG DATABASE_URL


RUN pnpm run build
