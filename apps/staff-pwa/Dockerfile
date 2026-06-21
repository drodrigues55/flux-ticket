# Multi-stage production Dockerfile for staff-pwa Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json turbo.json ./
COPY packages ./packages
COPY apps/staff-pwa ./apps/staff-pwa

RUN npm ci
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@flux/staff-pwa

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/staff-pwa ./apps/staff-pwa
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@flux/staff-pwa"]
