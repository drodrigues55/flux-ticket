# Redis Compatibility & Safety Testing

This document details how we test and validate our Redis integration across different providers (local Redis and Upstash Redis).

## Concurrency and Lock Testing

We run a strict concurrency suite to verify inventory locking behavior under load:
- The Lua script `reserve_ticket.lua` is evaluated atomically using `evalsha`.
- Stress tests execute concurrent ticket purchase reservations to confirm that no overselling happens.
- Unit tests verify that double-checkout attempts are blocked by the locking mechanism.

## Rate Limiting Validation

Rate limiting tests verify that client endpoints are protected:
- We test our custom NestJS `RedisThrottlerStorage` against standard Redis commands.
- We assert that repeated requests to `/payments/checkout` or `/tickets/reserve` beyond the configured limit return a HTTP 429 Too Many Requests response.
- We verify that rate limit errors return safe user-facing payloads along with the standard `requestId`.

## Automated Configuration Tests

Unit tests in `packages/types/src/index.test.ts` verify the behavior of our Redis configuration parser:
- Test that missing production variables trigger clean failures.
- Test that `REDIS_PROVIDER=upstash` correctly adds secure TLS options and upgrades protocol prefixes.
