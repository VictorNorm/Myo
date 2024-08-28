# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.13.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js/Prisma"

WORKDIR /app

ENV NODE_ENV="production"

FROM base as build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy prisma directory
COPY prisma ./prisma

# List contents to verify files are copied correctly
RUN echo "Contents of /app:" && ls -la && echo "Contents of /app/prisma:" && ls -la prisma

# Install dependencies
RUN npm ci --include=dev

# Debug: Check Prisma version and list global npm packages
RUN npx prisma --version && npm list -g --depth=0

# Generate Prisma Client with explicit schema path
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy the rest of the application code
COPY . .

RUN npx tsc

RUN npm run build

RUN echo "Contents of /app/build:" && ls -la build && echo "Contents of /app/build/src:" && ls -la build/src

RUN npm prune --omit=dev

FROM base

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY --from=build /app /app

EXPOSE 3000
CMD [ "node", "build/src/index.js" ]