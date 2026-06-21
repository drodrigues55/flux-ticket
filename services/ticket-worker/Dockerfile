# Multi-stage production Dockerfile for ticket-worker
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json turbo.json ./
COPY packages ./packages
COPY services/ticket-worker ./services/ticket-worker

RUN npm ci
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@flux/ticket-worker

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/ticket-worker ./services/ticket-worker
COPY package*.json ./

ENV NODE_ENV=production
CMD ["npm", "run", "start", "-w", "@flux/ticket-worker"]
