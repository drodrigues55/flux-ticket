# 🤖 Agent Onboarding & Codebase Resume

Welcome, agent. This resume serves as a high-density reference manual for understand the Flux Tickets codebase, architecture boundaries, key patterns, and strict behavioral rules.

---

## 🏛️ System Architecture

Flux Tickets uses a CQRS-like architecture, separating read and write pathways into independent services, sharing schemas, UI components, and TypeScript models via packages in a Turborepo monorepo.

### Monorepo Structure

* **`apps/`**
  * [client](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/apps/client): Next.js consumer portal (ticket discovery and purchase).
  * [dashboard](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/apps/dashboard): Next.js organizer command center (prioritized event monitoring and payouts).
  * [staff-pwa](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/apps/staff-pwa): Offline-capable PWA for gate staff to scan and validate tickets.
* **`services/`**
  * [api-read](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/services/api-read): NestJS/Fastify backend optimized for read-only aggregations and dashboard queries.
  * [api-write](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/services/api-write): NestJS backend handling transactional mutations, checkouts, and payment webhooks.
  * [ticket-worker](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/services/ticket-worker): BullMQ worker handling asynchronous order fulfillment and queue processing.
* **`packages/`**
  * [database](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/packages/database): Prisma client instance, schema definition, and migration files.
  * [types](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/packages/types): Shared TypeScript interfaces and validation schemas (Zod).
  * [ui](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/packages/ui): Shared atomic component library.

---

## 📊 Database Schema Summary

The database uses PostgreSQL (managed via Prisma). Schema path: [schema.prisma](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/packages/database/prisma/schema.prisma).

### Key Entities
* **Event**: Organizers own events. Has fields for capacity targets and images.
* **TicketType & TicketBatch**: Manage batch pricing, availability (safety inventory stock), and progression rules.
* **Ticket**: Represents an individual ticket. Denormalized fields (`eventId`, `status`, `checkedInAt`) optimized for read performance.
* **Reservation & ReservationItem**: Track temporary locked tickets during checkouts.
* **Payment & Order**: Hold transaction state and external provider references (e.g., Mercado Pago, Stripe).
* **EventAlert**: Surge operational warnings for the dashboard.
* **OutboxEvent**: Used for transactional outbox pattern to maintain eventual consistency.

---

## 🧠 Dashboard Agent Behavior Rules (CRITICAL)

When editing or designing components for the **Dashboard** (`apps/dashboard`), you **must** adhere to these strict product principles:

### 1. Operational Command Center Philosophy
The dashboard is *not* a generic metrics repository. It is an operational command center.
* Prioritize actionable warnings and event statuses over vanity metrics.
* Core dashboard question: *"What event needs my attention right now, why, and what should I do?"*

### 2. Event Prioritization & Visual Hierarchy
Every event has a priority level determined by conditions (closeness to date, sales trends, occupancy targets, operational alerts, pending refunds, check-in issues).
* **Critical (Hero Card)**: Displayed as a single, large card at the top. Contains image, name, revenue, occupancy, payout, trend, and a primary action button.
* **Attention (Medium Cards)**: Limit to 2–4 cards showing the main issue, revenue, occupancy, and remaining days.
* **Healthy (Compact Cards)**: Minimal information (name, occupancy, status, date). Avoid detailed metrics.
* **Empty State**: If all events are healthy, replace alert lists with: *"All events are operating normally."* and show performance insights.

### 3. Widget Interactivity Rules
* **NOT Clickable**: Revenue KPI, Tickets KPI, Occupancy KPI, summary statistics.
* **Clickable (Drill-Down)**: Charts, Alerts, Event cards, Activity log items.

---

## 🛠️ Development & Command Cheat Sheet

### Database Updates
When changing the database schema, do not update Prisma locally inside services. Update the core package:
```bash
# 1. Update the schema file: packages/database/prisma/schema.prisma
# 2. Generate clients:
npx prisma generate --schema=packages/database/prisma/schema.prisma
# 3. Create migrations:
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

### Dev Mode Startup
```bash
npm install
npm run dev
```
Use `http://localhost:3000` (Client) and `http://localhost:3001` (Dashboard) for manual UI verification.
