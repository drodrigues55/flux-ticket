# Deployment Prep

Deployment preparation details for RC1.

## Required Services
- PostgreSQL (database storage)
- Redis (job queues and rate limits)

## Required Environment Variables
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `HMAC_SECRET`

## Migration Steps
1. Run Prisma migration deployment:
   ```bash
   npx prisma migrate deploy
   ```

## Build Steps
1. Run full monorepo build:
   ```bash
   npm run build
   ```

## Startup Order
1. Run Database and Redis services.
2. Start API Write service: `npm run start --workspace @flux/api-write`
3. Start API Read service: `npm run start --workspace @flux/api-read`
4. Start Workers: `npm run start --workspace @flux/ticket-worker`
5. Start Frontends (`dashboard`, `client`, `staff-pwa`).

## Health Check URLs
- Write API: `http://localhost:4000/health`
- Read API: `http://localhost:3002/health`

## Known Deployment Gaps
- Docker/Kubernetes container orchestration setup.
- Auto-scaling rules.
- SSL and domain proxy mapping automation.
