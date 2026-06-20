# Performance

> Status: Active
> Last Updated: June 2026

---

# Overview

Performance testing covers the current operational bottlenecks in checkout, dashboard reads, queue throughput, and worker processing.

The implementation already exposes the pressure points through:

- checkout throttling in `services/api-write/src/tickets/checkout.service.ts`
- queue processing in `services/ticket-worker/src/workers.ts`
- dashboard aggregation in `services/api-read/src/dashboard/dashboard.service.ts`
- dashboard polling and rendering in `apps/dashboard/src/pages/index.tsx`

---

# What to Measure

Performance tests should measure:

- checkout latency
- queue backlog growth
- worker throughput
- dashboard response time
- lots-performance query time
- proxy overhead on dashboard reads

---

# Current Pressure Points

## Checkout Throttle

The checkout flow already enforces a concurrent access limit.

Performance validation should confirm that the throttle:

- blocks excess load predictably
- does not degrade successful requests
- remains stable under burst traffic

## Worker Throughput

The worker handles payment recovery, ticket issuance, waitlist invitations, abandoned carts, and analytics jobs.

Performance tests should ensure that a single noisy queue does not stall unrelated work.

## Dashboard Aggregation

Dashboard reads currently aggregate transactional data directly.

Performance validation should watch for:

- large organizer event sets
- repeated polling
- expensive lot performance queries
- alert volume spikes

---

# Acceptance Criteria

Performance testing is acceptable when:

- the current checkout and dashboard paths remain responsive under expected load
- queue latency stays bounded
- no pathological slowdown appears in the proxy or worker loop
- bottlenecks are visible in logs and metrics

This document intentionally avoids inventing future SLOs that are not yet defined in the codebase.

