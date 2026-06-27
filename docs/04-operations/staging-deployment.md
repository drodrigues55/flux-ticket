# Staging Deployment

Staging deployment instructions prepared; deployment successfully executed on local-staging simulation environment.

## Target Environment
- **Local Staging**: Simulation using separate node process mappings for API Write (`port 4000`), API Read (`port 3002`), and frontends.

## Required Services
- PostgreSQL (database storage)
- Redis (queues & rate limits)

## Migration Command
```bash
npx prisma migrate deploy
```

## Seed Data Command
```bash
npx prisma db seed
```

## Service Startup Order
1. Database and Redis container instances.
2. API services.
3. Frontends.
