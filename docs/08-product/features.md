# Features

> Version: 2.2
> Last Updated: June 2026

---

# Overview

This document tracks every feature implemented, planned, or under development in Flux Tickets.

It acts as the master product checklist for the platform.

Feature status definitions:

| Status | Meaning     |
| ------ | ----------- |
| ✅      | Implemented |
| 🚧     | In Progress |
| 📋     | Planned     |
| 💡     | Future Idea |

---

# Product Phase Status

| Phase                                                     | Status |
| --------------------------------------------------------- | :----: |
| Phase 1 — Core Infrastructure & Architecture              |   ✅   |
| Phase 2 — Foundation, QA, Forms & Wizard Patterns         |   ✅   |
| Phase 3 — Event Creation Flow                             |   ✅   |
| Phase 4 — Organizer Portal                                |   ✅   |
| Phase 5 — Ticket Workspace                                |   ✅   |
| Phase 6 — Batch Management UI                             |   ✅   |
| Phase 7 — Publishing Workflow                             |   ✅   |
| Phase 8 — Consumer Portal / Public Sales Flow             |   ✅   |
| Phase 9 — Staff Portal / Gate Operations                  |   ✅   |
| Phase 10 — Ticket Delivery MVP                            |   ✅   |
| Phase 11 — Payment Readiness & Mock-to-Real Gateway Adapter |   ✅   |
| Phase 12 — Financial Center MVP                           |   ✅   |
| Phase 13 — Organizer Dashboard 2.0                        |   ✅   |
| Phase 14 — Organization Management MVP                    |   ✅   |
| Phase 15 — Production Hardening & Release Readiness       |   ✅   |

# Release Status

| Milestone | Status |
| --------- | :----: |
| MVP Core Product Loop | ✅ |
| QA-1 Backend Failure Coverage | ✅ |
| QA-2 Cross-Package Validation | ✅ |
| QA-3 Phases 11–15 Validation | ✅ |
| RC1 Documentation Pack | ✅ |
| RC1 Manual QA | ✅ |
| RC1 Smoke Test | ✅ |
| RC1 Deployment Prep | ✅ |
| RC1 Approval | ✅ With Known Non-Blocking Issues |
| Staging/Demo Deployment | ✅ |
| Demo Ready | ✅ |
| Production Release | 📋 |

---

# Core Platform

| Feature               | Status |
| --------------------- | :----: |
| Monorepo Architecture |    ✅   |
| Shared Packages       |    ✅   |
| PostgreSQL            |    ✅   |
| Redis                 |    ✅   |
| BullMQ Workers        |    ✅   |
| Outbox Pattern        |    ✅   |
| Request ID            |    ✅   |
| Structured Logging    |    ✅   |
| AuditLog              |    ✅   |
| TicketStatusHistory   |    ✅   |

---

# Authentication

| Feature                           | Status |
| --------------------------------- | :----: |
| Organizer Authentication          |   🚧   |
| Staff Identification (Name + CPF) |    ✅   |
| Customer Checkout Without Account |    ✅   |
| JWT Authentication                |    ✅   |
| Role Based Access Control         |    ✅   |
| Refresh Tokens                    |   📋   |
| Password Recovery                 |   📋   |
| Two-Factor Authentication         |   💡   |
| Device Registration               |   📋   |

---

# Consumer Portal

| Feature                  | Status |
| ------------------------ | :----: |
| Public Event List        |    ✅   |
| Public Event Detail Page |    ✅   |
| Public Ticket Selector   |    ✅   |
| Public Event Search      |    ✅   |
| Cart / Reservation Entry |    ✅   |
| Checkout Page UX         |    ✅   |
| Order Confirmation Page  |    ✅   |
| Event Recommendations    |   💡   |

---

# Organizer Dashboard

| Feature             | Status |
| ------------------- | :----: |
| Dashboard Overview  |    ✅   |
| Hero Event          |    ✅   |
| Priority Events     |    ✅   |
| Operational Alerts  |    ✅   |
| Lot Performance     |    ✅   |
| Revenue Cards       |   🚧   |
| Export Reports      |   📋   |
| Financial Dashboard |   📋   |
| Organizer Settings  |   📋   |

---

# Organizer Portal

| Feature            | Status |
| ------------------ | :----: |
| Event List         |    ✅   |
| Event Search       |    ✅   |
| Event Filters      |    ✅   |
| Event Detail Shell |    ✅   |
| Draft Management   |    ✅   |
| Duplicate Event    |    ✅   |
| Archive Event      |    ✅   |
| Delete Draft Event |    ✅   |

---

# Event Creation Workflow

| Feature                  | Status |
| ------------------------ | :----: |
| Event Creation Wizard    |    ✅   |
| Basic Information Step   |    ✅   |
| Minimal Ticket Step      |    ✅   |
| Review Step              |    ✅   |
| Save Draft               |    ✅   |
| Ready For Validation     |    ✅   |
| Full Publishing Workflow |    ✅   |

---

# Event Management

| Feature                        | Status |
| ------------------------------ | :----: |
| Create Event                   |    ✅   |
| Edit Event                     |    ✅   |
| Publishing Entry Point         |    ✅   |
| Publish Event                  |    ✅   |
| Publishing Validation Workflow |    ✅   |
| Archive Event                  |    ✅   |
| Duplicate Event                |    ✅   |
| Delete Draft Event             |    ✅   |
| Cancel Event                   |   📋   |
| Event Banner                   |   📋   |
| Event Categories               |   📋   |
| Event Tags                     |   💡   |

---

# Publishing Workflow

| Feature               | Status |
| --------------------- | :----: |
| Publishing Checklist  |    ✅   |
| Publishing Validation |    ✅   |
| Blockers and Warnings |    ✅   |
| Public Preview        |    ✅   |
| Publish Action        |    ✅   |
| Unpublish Action      |    ✅   |
| Published Event State |    ✅   |

---

# Ticket Workspace

| Feature                 | Status |
| ----------------------- | :----: |
| Ticket Type Workspace   |    ✅   |
| Ticket Type Information |    ✅   |
| Ticket Type CRUD        |    ✅   |
| Duplicate Ticket Type   |    ✅   |
| Archive Ticket Type     |    ✅   |
| Ticket Capacity         |    ✅   |
| Purchase Limits         |    ✅   |
| Refundable Tickets      |    ✅   |
| Transferable Tickets    |    ✅   |

---

# Ticket Batches

| Feature                           | Status |
| --------------------------------- | :----: |
| Multiple Batches                  |    ✅   |
| Batch Inventory                   |    ✅   |
| Batch Visibility                  |    ✅   |
| Sales Window                      |    ✅   |
| Default Batch From Event Creation |    ✅   |
| Batch CRUD UI                     |    ✅   |
| Batch Duplication                 |    ✅   |
| Batch Reordering                  |    ✅   |
| Batch Preview                     |    ✅   |
| Batch Validation                  |    ✅   |
| Manual Batch Progression          |    ✅   |
| Sector Support                    |   🚧   |
| Dynamic Pricing                   |   💡   |

---

# Checkout

| Feature                   | Status |
| ------------------------- | :----: |
| Reservation               |    ✅   |
| Reservation Expiration    |    ✅   |
| Inventory Lock            |    ✅   |
| Checkout Flow             |    ✅   |
| Multiple Payment Attempts |    ✅   |
| Abandoned Cart Recovery   |   🚧   |
| Guest Checkout            |    ✅   |
| Customer Account          |   📋   |

---

# Payment Engine

| Feature | Status |
| ------- | :----: |
| PaymentProvider Interface | ✅ |
| Mock Payment Provider | ✅ |
| Provider Capability Model | ✅ |
| Payment Lifecycle State Machine | ✅ |
| Mock Payment Failure Simulation | ✅ |
| Webhook Adapter Skeleton | ✅ |
| Payment Idempotency Handling | ✅ |
| Payment Reconciliation Placeholder | ✅ |
| Payment Debug Read Model | ✅ |
| Pending Payments | ✅ |
| Approved Payments | ✅ |
| Failed Payments | ✅ |
| Expired Payments | ✅ |
| Payment Recovery Worker | ✅ |
| Mercado Pago | 📋 |
| Stripe | 💡 |
| Asaas | 💡 |
| Refunds | 📋 |
| Chargebacks | 📋 |

---

# Phase 11 Payment Readiness Limitations

| Limitation | Status |
| ---------- | :----: |
| Real gateway integration | 📋 |
| External API calls, credentials, or real signature verification | 📋 |
| Real refund workflow | 📋 |
| Settlement/reconciliation engine beyond placeholder status checks | 📋 |
| Chargeback handling | 📋 |
| Checkout provider UI redesign | 📋 |
| Publishing, coupons, seating, analytics, or dashboard expansion | 📋 |

---

# Ticket Engine

| Feature                   | Status |
| ------------------------- | :----: |
| Ticket Generation         |    ✅   |
| Immutable Ticket Identity |    ✅   |
| QR Generation             |    ✅   |
| HMAC Signature            |    ✅   |
| TicketStatusHistory       |    ✅   |
| Ticket Validation         |    ✅   |
| QR Versioning             |   📋   |
| Ticket Transfer           |   📋   |
| Ticket Revocation         |   📋   |

---

# Wallets

| Feature                | Status |
| ---------------------- | :----: |
| Apple Wallet (.pkpass) |   📋   |
| Google Wallet          |   📋   |
| PDF Ticket             |   📋   |
| Email Delivery         |    ✅   |
| Wallet Updates         |   💡   |

---

# Staff PWA

| Feature             | Status |
| ------------------- | :----: |
| Offline Bundle      |    ✅   |
| IndexedDB Storage   |    ✅   |
| Offline Validation  |    ✅   |
| Offline Queue       |    ✅   |
| Synchronization     |   🚧   |
| Conflict Resolution |   🚧   |
| Camera Scanner      |   📋   |
| Staff Login         |   📋   |
| Device Registration |   📋   |

---

# Waitlist

| Feature               | Status |
| --------------------- | :----: |
| Join Waitlist         |    ✅   |
| FIFO Processing       |    ✅   |
| Worker Invitations    |   🚧   |
| Invitation Expiration |   📋   |
| Automatic Promotion   |   📋   |

---

# Notifications

| Feature            | Status |
| ------------------ | :----: |
| Notification Queue |    ✅   |
| Email Provider     |    ✅   |
| Resend Provider    |    ✅   |
| WhatsApp Provider  |   📋   |
| SMS Provider       |   💡   |
| Push Notifications |   💡   |

---

# Analytics

| Feature            | Status |
| ------------------ | :----: |
| Overview KPIs      |    ✅   |
| Priority Event     |    ✅   |
| Operational Alerts |    ✅   |
| Revenue Metrics    |   🚧   |
| Occupancy Metrics  |    ✅   |
| Sales Trends       |   📋   |
| Forecasting        |   📋   |
| AI Insights        |   💡   |

---

# Security

| Feature           | Status |
| ----------------- | :----: |
| JWT               |    ✅   |
| RBAC              |    ✅   |
| AuditLog          |    ✅   |
| HMAC QR           |    ✅   |
| Request IDs       |    ✅   |
| Idempotency       |   🚧   |
| Distributed Locks |   🚧   |
| Rate Limiting     |   📋   |
| Secret Rotation   |   📋   |

---

# Infrastructure

| Feature          | Status |
| ---------------- | :----: |
| PostgreSQL       |    ✅   |
| Redis            |    ✅   |
| BullMQ           |    ✅   |
| Health Endpoints |    ✅   |
| Metrics          |    ✅   |
| Sentry           |   🚧   |
| Docker           |   📋   |
| Kubernetes       |   💡   |

---

# Observability

| Feature             | Status |
| ------------------- | :----: |
| Structured Logs     |    ✅   |
| Request Correlation |    ✅   |
| Queue Metrics       |    ✅   |
| Health Checks       |    ✅   |
| Prometheus          |    ✅   |
| Grafana Dashboards  |   📋   |
| Alert Manager       |   📋   |

---

# Testing

| Feature           | Status |
| ----------------- | :----: |
| Prisma Validation |    ✅   |
| Smoke Tests       |    ✅   |
| Queue Validation  |   🚧   |
| Concurrency Tests |   🚧   |
| Performance Tests |   📋   |
| Load Testing      |   📋   |
| Chaos Testing     |   💡   |

---

# Future Roadmap

Planned platform capabilities include:

* Financial Center MVP
* Organizer Dashboard 2.0
* Staff Portal expansion
* Ticket Delivery MVP
* Organization Management
* Coupon Engine
* Promotional Codes
* Reserved Seating
* Affiliate Sales
* Membership Programs
* Subscription Events
* Dynamic Pricing
* White Label Platform
* Public API
* Webhooks for Organizers
* Mobile Applications
* AI Operational Assistant

---

# Current MVP Focus

Current implementation has completed the core ticketing loop and Phase 11 payment readiness work, covering:

* Core platform architecture
* Event creation
* Organizer event management
* Ticket workspace
* Batch management
* Publishing validation
* Consumer event discovery
* Public checkout and confirmation
* Payment provider abstraction
* Mock-to-real gateway adapter readiness
* Payment lifecycle and idempotency hardening
* Webhook adapter skeleton
* Payment reconciliation placeholder
* Ticket issuance foundation
* Offline validation foundation
* Organizer dashboard foundation
* Background processing
* Observability

The current product stage is late-MVP: the platform now supports the core ticketing loop from organizer event creation through publishing and consumer checkout, and the payment layer is prepared for a future real gateway. Remaining gaps are mostly real gateway integration, financial tooling, ticket delivery channels, staff workflows, enterprise controls, growth tooling, and production hardening.

---
# Next Product Milestones

The next major milestones are:

1. Phase 16 — RC1 Risk Cleanup: Dashboard Event Creation & Demo Seed Consistency
2. Phase 17 — Resend Email Delivery Integration
3. Phase 18 — PostHog Product Analytics
4. Phase 19 — Upstash Redis Compatibility & Managed Redis Readiness
5. Phase 20 — Real Payment Gateway Integration
6. Phase 21 — Staging / Production Deployment Plan
7. Phase 22 — Supabase Managed Infrastructure Evaluation
8. Staff Portal Expansion
9. Refunds and Chargebacks
10. Growth and Marketing Tools
11. Reserved Seating
12. White Label / Enterprise Capabilities
13. Future AI / Semantic Search Infrastructure

Future development expands the platform while preserving the existing architecture, CQRS boundaries, shared contracts, and business rules.

Managed services should be introduced incrementally:

* Resend is the first integration priority because email delivery directly supports ticket delivery, resend flows, organization invites, and purchase confirmations.
* PostHog should follow as product analytics for checkout, ticketing, staff validation, and dashboard usage funnels.
* Upstash should be evaluated for Redis-compatible rate limiting, idempotency keys, locks, and reservation TTL behavior before replacing any BullMQ-critical Redis usage.
* Supabase should be evaluated as managed Postgres/Auth/Storage infrastructure, not as a replacement for `api-write`, `api-read`, or `ticket-worker`.
* Pinecone should remain future-facing and only be introduced when Flux Tickets has a real AI, semantic search, or operational assistant use case.
