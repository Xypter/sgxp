# Astro (output: 'server', @astrojs/node standalone adapter) production image

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image - only the compiled output and production deps
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 astro
RUN adduser --system --uid 1001 astro

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/public ./public

RUN npm ci --omit=dev

USER astro

EXPOSE 4321
ENV HOST=0.0.0.0
ENV PORT=4321

CMD ["node", "./dist/server/entry.mjs"]
