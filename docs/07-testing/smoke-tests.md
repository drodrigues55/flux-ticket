# Smoke Tests

> Status: Active
> Last Updated: June 2026

---

# Overview

Smoke tests verify that the platform boots and the critical read/write surfaces are reachable before deeper validation begins.

They are a fast gate for deployment confidence, not a substitute for integration coverage.

---

# What Smoke Tests Cover

Current smoke tests should cover:

- API startup
- PostgreSQL connectivity
- Redis connectivity
- dashboard proxy routing
- request-id propagation
- health endpoints
- metrics availability or explicit disablement

Relevant implementation points include:

- `services/api-read/src/index.ts`
- `services/api-write/src/health/health.controller.ts`
- `services/api-write/src/main.ts`
- `apps/dashboard/src/pages/api/dashboard/[...path].ts`
- `scripts/smoke-observability-compat.ts`

---

# Required Assertions

Smoke tests should confirm:

- the process starts without throwing
- the service responds on the expected route
- protected dashboard reads still resolve through the Next.js proxy
- readiness checks report healthy dependencies
- errors preserve a request id and structured envelope

---

# Suggested Checks

At minimum, a smoke run should hit:

- `/health/live`
- `/health/ready`
- `/version`
- `/metrics` when enabled, or the documented disabled behavior
- `/dashboard/overview`
- `/dashboard/alerts`

The response shape should match the existing contract, including the Phase 1 envelope where applicable.

---

# Failure Policy

Smoke test failures should fail fast.

The expected output is a clear operational signal, not a long diagnostic trace.

