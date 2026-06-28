# Upstash Redis Setup Guide

This operational runbook explains how to configure and deploy Upstash Redis as a managed Redis option.

## Environment Variables

| Variable | Type | Example | Description |
|---|---|---|---|
| `REDIS_PROVIDER` | string | `upstash` or `local` | Tells the configuration layer whether to enforce TLS and adapt URLs. |
| `REDIS_URL` | string | `rediss://default:password@my-upstash.upstash.io:6379` | Fallback Redis connection URL. |
| `UPSTASH_REDIS_REST_URL` | string | `https://my-upstash.upstash.io` | Upstash HTTP REST endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | string | `***` | Access token for the REST endpoint. |
| `QUEUE_REDIS_URL` | string | `redis://localhost:6379` | Custom override for BullMQ queues (keeps standard Redis). |
| `CACHE_REDIS_URL` | string | `rediss://...` | Custom override for general caching. |
| `RATE_LIMIT_REDIS_URL` | string | `rediss://...` | Custom override for rate-limiter storage. |

## SSL / TLS Setup

Upstash Redis requires TLS connections.
- Set `REDIS_PROVIDER=upstash`.
- The configuration parser will automatically configure `tls: {}` for the `ioredis` driver.
- Secure connection URLs must start with `rediss://`.

## Fallback & Rollback Plan

If Upstash encounters performance issues or rate limits:
1. Revert `REDIS_PROVIDER` to `local`.
2. Ensure `REDIS_URL` points back to local or managed Elasticache instances.
3. Restart the services (`api-write` and `api-read`).
