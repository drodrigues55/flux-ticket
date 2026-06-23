# Multi-stage production Dockerfile for client Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/client ./apps/client

RUN npm ci
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@flux/client

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/client/.next/standalone ./
COPY --from=builder /app/apps/client/.next/static ./apps/client/.next/static

ENV NODE_ENV=production
ENV PORT=3003
EXPOSE 3003
CMD ["node", "apps/client/server.js"]
