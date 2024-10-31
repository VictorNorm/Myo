# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.13.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js/Prisma"

WORKDIR /app

ENV NODE_ENV="production"
# Explicitly set host and port
ENV HOST="0.0.0.0"
ENV PORT="3000"

FROM base as build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    openssl \
    pkg-config \
    python-is-python3 \
    # Add debugging tools
    procps \
    net-tools \
    netcat \
    curl

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
    apt-get install --no-install-recommends -y \
    openssl \
    # Add minimal debugging tools to production image
    procps \
    net-tools \
    curl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY --from=build /app /app

# Add a health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# Add debugging information before starting
CMD echo "Starting server with ENV:" && \
    echo "NODE_ENV=$NODE_ENV" && \
    echo "HOST=$HOST" && \
    echo "PORT=$PORT" && \
    netstat -tulpn && \
    npx prisma migrate deploy && \
    node build/src/index.js