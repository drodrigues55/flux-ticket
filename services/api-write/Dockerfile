# Multi-stage production Dockerfile for api-write
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json turbo.json ./
COPY packages ./packages
COPY services/api-write ./services/api-write

RUN npm ci
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@flux/api-write

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api-write ./services/api-write
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@flux/api-write"]
