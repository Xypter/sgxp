FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 bot && adduser --system --uid 1001 bot

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER bot

CMD ["node", "src/index.js"]
