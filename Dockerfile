# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build both frontend and backend
COPY . .
RUN npm run build && npm run build:server

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV CORS_ORIGIN=https://uu.clicque.de

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy compiled artifacts from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/server_build ./server_build

EXPOSE 8000

CMD ["node", "server_build/server.js"]
