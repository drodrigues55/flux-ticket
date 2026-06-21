# Multi-stage production Dockerfile for api-read
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json turbo.json ./
COPY packages ./packages
COPY services/api-read ./services/api-read

RUN npm ci
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@flux/api-read

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api-read ./services/api-read
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002
CMD ["npm", "run", "start", "-w", "@flux/api-read"]
