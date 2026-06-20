# MVP

> Status: Active
> Last Updated: June 2026

---

# Overview

The Flux Tickets MVP is the smallest cohesive product slice already represented by the codebase and roadmap.

It includes discovery, checkout, ticket issuance, staff validation, organizer operations, and backend observability for the critical paths.

---

# MVP Boundary

The current MVP boundary is defined by the shipped implementation and the confirmed roadmap items in `docs/00-product/roadmap.md`.

Core included surfaces:

- consumer event discovery and checkout
- reservation-based inventory protection
- ticket issuance and validation
- staff PWA check-in flow
- organizer dashboard with real backend data
- worker-driven asynchronous processing

---

# What Must Work

An MVP release should cover:

- published events visible to customers
- inventory reservation during checkout
- payment approval leading to ticket issuance
- ticket QR validation
- offline-friendly staff check-in flow
- organizer visibility into sales, alerts, and priority events

---

# Current Implementation Signals

The codebase already supports:

- `api-read` dashboard read models
- `api-write` transactional checkout and ticket lifecycle updates
- worker-side payment recovery and event processing
- dashboard UI consuming real backend contracts

The MVP doc should stay aligned with that live surface and not introduce unsupported product claims.

