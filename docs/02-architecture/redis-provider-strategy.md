# Redis Provider Strategy

Flux Tickets uses Redis for distributed coordination, real-time inventory locking, and API rate limiting. This document details our architecture, the features used, and the compatibility strategies for managed providers (such as Upstash Redis).

## Redis Usage Matrix

| Area | Redis Feature Used | Criticality | Upstash Compatible? | Notes |
| ---- | ------------------ | ----------- | ------------------- | ----- |
| **Inventory Lock & TTL** | Lua script (`EVALSHA`), `TTL`, `EXPIRE`, pipelines | High | Yes | Essential to avoid overselling tickets during concurrent transactions. |
| **Rate Limiting** | `INCR`, `EXPIRE`, `TTL` | Medium | Yes | Used via custom NestJS Throttler Storage to rate limit checkout and sync endpoints. |
| **Telemetry & Settings**| `GET`, `SET`, `LPUSH`, `LTRIM`, `LRANGE` | Low | Yes | Telemetry data uses lists capped at 20 entries; settings are strings. |
| **Queues (BullMQ)** | Transactions, blocking commands (`BRPOPLPUSH`, `BLMOVE`), Lua script state updates | High | Partial | Intensive script usage and connection-per-queue characteristics. |

## Compatibility Recommendation & Decision

Following an evaluation of Upstash Redis:

1. **Partial Upstash Usage Approved**: Upstash is fully approved for inventory locking, rate limiting, and telemetry cache storage.
2. **Standard Redis for Queues (BullMQ)**: Keep BullMQ queue workloads on standard Redis instances (e.g. self-hosted or AWS ElastiCache) for now. BullMQ relies heavily on blocking commands and high command frequency which are less suitable for serverless-focused Upstash connections.

### Isolation Rules
- Queues can be directed to a separate instance via `QUEUE_REDIS_URL`.
- General cache and rate-limiting can point to `CACHE_REDIS_URL` or `RATE_LIMIT_REDIS_URL`.
- Default fallback remains `REDIS_URL`.
