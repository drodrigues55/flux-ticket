# DDoS Risk Report

All API gateways are protected by global rate limiters:
- NestJS api-write: 60 req/min limit.
- Express api-read: 300 req/15min limit.

No unprotected endpoints found. Heavy-query endpoints should still implement cursor pagination.