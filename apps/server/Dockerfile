FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.1 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY tsconfig.base.json ./
RUN pnpm --filter @jobbarm/shared build
RUN cd apps/server && pnpm exec prisma generate
RUN pnpm --filter server build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and node_modules from builder (includes generated prisma client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY apps/server/prisma ./apps/server/prisma
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

WORKDIR /app/apps/server
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
