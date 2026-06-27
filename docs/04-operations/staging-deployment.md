# Staging Deployment

Staging deployment instructions prepared; deployment not executed.

## Setup Requirements
1. **Services**: Provision a managed PostgreSQL instance and a Redis container.
2. **Environment Variables**: Configure the environment with high-entropy JWT and HMAC keys.
3. **Database migrations**: Execute `npx prisma migrate deploy`.
4. **Seed**: Populate baseline profiles using `npx prisma db seed`.
5. **Compilation**: Execute the monorepo build: `npm run build`.
6. **Start Order**:
   - Write API: `npm run start --workspace @flux/api-write`
   - Read API: `npm run start --workspace @flux/api-read`
   - Workers: `npm run start --workspace @flux/ticket-worker`
   - Dashboard & Client frontends.
