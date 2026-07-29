FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

ARG SUPABASE_CLI_VERSION=2.81.3

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    gh \
    postgresql \
    postgresql-client \
  && npm install -g "supabase@${SUPABASE_CLI_VERSION}" \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

USER node
