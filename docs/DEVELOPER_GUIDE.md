# Developer Quickstart & Onboarding Guide

Welcome to the Flux Tickets developer guide. This document contains instructions to set up your local development environment and understand the monorepo workspace.

---

## 🛠️ Prerequisites

Before you start, make sure you have the following services installed and running locally:

1. **Node.js** (v18 or higher recommended)
2. **PostgreSQL** (Port `5432`)
3. **Redis** (Port `6379`)

---

## 🚀 Setup Steps

### 1. Clone & Install Dependencies
First, clone the repository and install all workspaces dependencies from the root directory:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file in the root to a new file named `.env`:
```bash
cp .env.example .env
```
Ensure that the connection strings are pointing to your local instances:
* `DATABASE_URL="postgresql://user:password@localhost:5432/flux_tickets?schema=public"`
* `REDIS_URL="redis://localhost:6379"`

### 3. Database Initialization
Deploy database schemas and seed initial data:
```bash
# Generate the Prisma client
npx prisma generate --schema=packages/database/prisma/schema.prisma

# Run migrations to set up the DB tables
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma

# (Optional) Seed the database with mock records
npm run seed -w packages/database
```

### 4. Running the Development Servers
Use Turborepo to spin up all applications and services concurrently:
```bash
npm run dev
```
This runs:
- **api-write** (Mutations, checkout, payments gateway mock)
- **api-read** (Read-only endpoints, dashboard aggregations)
- **ticket-worker** (BullMQ queue consumer)
- **apps/dashboard** (Organizer dashboard frontend)
- **apps/client** (Consumer ticketing portal)
- **apps/staff-pwa** (Gate validation PWA)

---

## 📁 Repository Structure

* **`apps/`**
  * `client/`: Next.js consumer web application.
  * `dashboard/`: Next.js organizer portal.
  * `staff-pwa/`: Offline-first validation app for staff.
* **`services/`**
  * `api-read/`: Read-oriented Fastify/Nest service.
  * `api-write/`: Write-oriented NestJS transactional backend.
  * `ticket-worker/`: BullMQ worker running asynchronous queues.
* **`packages/`**
  * `database/`: Shared database client (Prisma client & migrations).
  * `types/`: Shared TypeScript data structures and interfaces.
  * `ui/`: Shared design system component library.

---

## 🛠️ Helpful Commands

* **Open Prisma Studio**: To view and edit databases in an interactive UI:
  ```bash
  npx prisma studio --schema=packages/database/prisma/schema.prisma
  ```
* **Run Tests**:
  ```bash
  npm run test
  ```
* **Verify Critical Flows**: Run validation scripts (queues, integrity, concurrency):
  ```bash
  npm run ts-node scripts/validate-phase6a-queues.ts
  ```
