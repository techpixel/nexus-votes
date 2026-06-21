# syntax=docker/dockerfile:1

# ---- Build stage ----
# Compile the SvelteKit app into a standalone Node server (build/) via adapter-node.
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps against the lockfile for reproducible builds.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Build. No build-time env is needed — the app reads everything through
# $env/dynamic/private at runtime, so no secrets are baked into the image.
COPY . .
RUN npm run build

# ---- Runtime stage ----
# The build is fully self-contained (the app has no production dependencies),
# so the final image only carries the build output and the Node runtime.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# adapter-node listens on $PORT (default 3000) and $HOST (default 0.0.0.0).
ENV PORT=3000
EXPOSE 3000

# Run as the unprivileged user that ships with the node image.
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/package.json ./package.json
USER node

CMD ["node", "build"]
