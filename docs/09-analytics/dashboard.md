# Dashboard

> Status: Active
> Last Updated: June 2026

---

# Overview

The Organizer Dashboard is a backend-driven read surface for event operations, sales performance, and priority-based attention management.

It is powered by `services/api-read/src/dashboard/dashboard.service.ts` and rendered in `apps/dashboard/src/pages/index.tsx`.

The dashboard does not compute business metrics in the frontend. It consumes backend read models and Phase 1 envelopes through the Next.js proxy layer.

---

# Current Backend Contracts

Current dashboard endpoints:

```http
GET /dashboard/overview
GET /dashboard/priority-event
GET /dashboard/events-priority
GET /dashboard/events/:eventId/lots-performance
GET /dashboard/alerts
```

These endpoints are implemented in `services/api-read/src/dashboard/dashboard.controller.ts`. Most dashboard reads are organizer-scoped through the authenticated organizer context, but `GET /dashboard/events/:eventId/lots-performance` resolves by `eventId` and validates the event directly.

The proxy in `apps/dashboard/src/pages/api/dashboard/[...path].ts` forwards requests to `api-read` and preserves the request id.

---

# Dashboard Data Model

The overview response includes:

- Hero Event
- Attention events
- Healthy events
- Global KPIs
- Sales history
- Recent sales
- Batch performance
- Active checkout locks
- Operational controls

The backend builds these values from:

- `Event`
- `TicketBatch`
- `Ticket`
- `Payment`
- `Checkin`
- `Reservation`
- `TicketStatusHistory`
- `AuditLog`

That logic lives in `dashboard.service.ts` and is the canonical source for the dashboard read model.

---

# Widget Mapping

The current dashboard UI is organized around one backend contract per visible section:

- Hero Event card maps to `/dashboard/priority-event` or the hero portion of `/dashboard/overview`
- Event ranking cards map to `/dashboard/events-priority`
- Alerts feed maps to `/dashboard/alerts`
- Batch performance maps to `/dashboard/events/:eventId/lots-performance`
- The controller also exposes `GET /dashboard/events/lots-performance` as a 400 guard route for missing `eventId`
- Sales chart, recent sales, and totals map to `/dashboard/overview`

The UI in `apps/dashboard/src/pages/index.tsx` already consumes those contracts and renders real values, not mock data.

---

# Request Scope

Every dashboard request is scoped to the authenticated organizer.

The read service filters by organizer id and never mixes data between organizers.

Request ids are surfaced in the frontend when the backend returns an error envelope, which makes operational issues traceable without exposing internals.

---

# Current Behavior

The dashboard currently supports:

- hero selection by priority score
- operational alerts
- recent sales feed
- lot performance visualization
- sales trend history
- basic operational controls for throttling and pausing sales when the backend exposes them

Priority and alert generation are backend-owned. The frontend only formats and displays them.

---

# Notes

This document is intentionally aligned with the current implementation rather than future analytics ambitions.

Future work should extend this doc only when the backend exposes a new stable contract.

