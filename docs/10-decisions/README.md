# Architectural Decision Records (ADRs)

This directory serves as the log for all major architectural decisions made during the design and development of the **Flux Tickets** platform.

---

## 📋 ADR Index

| ID | Title | Status | Date | Core Focus / Outcome |
| :--- | :--- | :---: | :---: | :--- |
| **[ADR-001](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/10-decisions/ADR-001-monorepo.md)** | Monorepo Architecture | **Accepted** | 2026-06-19 | Consolidate services/apps inside Turborepo to leverage shared typings and database schemas. |
| **[ADR-002](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/10-decisions/ADR-002-outbox.md)** | Outbox Pattern for Asynchronous Events | **Accepted** | 2026-06-19 | Prevent data inconsistencies between write transactions and queue operations. |
| **[ADR-003](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/10-decisions/ADR-003-bullmq.md)** | BullMQ for Queue Processing | **Accepted** | 2026-06-19 | Use Redis-backed job queues for reliable asynchronous side effects and recovery. |
| **[ADR-004](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/10-decisions/ADR-004-payment-provider.md)** | Payment Provider Abstraction | **Accepted** | 2026-06-19 | Abstract external payment integration via a standard client interface (mock / Mercado Pago). |
| **[ADR-005](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/10-decisions/ADR-005-ticket-engine.md)** | Centralized Ticket Validation Engine | **Accepted** | 2026-06-19 | Centralize validation pipelines, HMAC security signatures, and state mutations on ticket check-ins. |
| **[ADR-006](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/10-decisions/ADR-006-offline-pwa.md)** | Offline Staff PWA with IndexedDB Sync | **Accepted** | 2026-06-19 | Enable offline check-ins for events using pre-downloaded cryptographic bundles and client-side validation. |

---

## 🏛️ ADR Process

We document decisions when they:
1. Impact multiple domains or system boundaries.
2. Introduce a new technology, framework, or architectural pattern.
3. Significantly change developer workflow or infrastructure requirements.

To propose a new decision:
1. Copy the formatting of an existing ADR.
2. Submit a Pull Request setting status to `Proposed`.
3. Align on the design and change status to `Accepted` upon consensus.
