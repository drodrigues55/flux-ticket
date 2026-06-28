# Demo Data

Configuration of baseline mock demo data for testing RC1.

## Demo Organization

- **Name**: Flux Demo Ltda.
- **CNPJ**: 12.345.678/0001-90

## Demo User

- **Dashboard Organizer**: `mock-organizer@flux.com`
- **Role**: `ORGANIZER`
- **Seed ID**: `organizer-mock`

## Demo Event States

- The RC1 seed creates published public events under the same `organizer-mock` account used by the dashboard proxy.
- Public catalog, dashboard event list, dashboard event workspace, Staff PWA event selection, and command center should point at the same prepared demo dataset after reseeding.
- The primary public purchase fixture is **Bee Gees Alive - Anapolis**, dated `2026-08-14T20:00:00Z` so it remains a future RC1 demo event.
- Seeded public events include slugs, image URLs, physical location metadata, ticket types, and active batches.

## Demo Ticket Types & Batches

- **General Admission** ticket type on every seeded event.
- Active batches for **PLATEIA SUPERIOR**, **PLATEIA VIP**, and **PLATEIA PREMIUM**.
- Half-price variants are enabled only for selected events.

## Seed and Reset Instructions

To reset the local developer database with these demo records, run:

```bash
npx prisma db seed
```

This reset is destructive for local demo data: it clears existing users, events, tickets, reservations, payments, check-ins, and related operational records before recreating the RC1 fixture.

> [!WARNING]
> - Never use real personal emails or phone numbers in seeds.
> - Never store real passwords or tokens in defaults.
