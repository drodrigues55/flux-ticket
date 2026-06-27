# Features

> Version: 2.1
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

# Completed Product Phases

| Phase                                             | Status |
| ------------------------------------------------- | :----: |
| Phase 1 — Core Infrastructure & Architecture      |    ✅   |
| Phase 2 — Foundation, QA, Forms & Wizard Patterns |    ✅   |
| Phase 3 — Event Creation Flow                     |    ✅   |
| Phase 4 — Organizer Portal                        |    ✅   |
| Phase 5 — Ticket Workspace                        |    ✅   |
| Phase 6 — Batch Management UI                     |    ✅   |
| Phase 7 — Publishing Workflow                     |    ✅   |
| Phase 8 — Consumer Portal / Public Sales Flow     |    ✅   |

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

| Feature                   | Status |
| ------------------------- | :----: |
| PaymentProvider Interface |    ✅   |
| Mock Payment Provider     |    ✅   |
| Pending Payments          |    ✅   |
| Approved Payments         |    ✅   |
| Failed Payments           |    ✅   |
| Expired Payments          |    ✅   |
| Payment Recovery Worker   |    ✅   |
| Mercado Pago              |   📋   |
| Stripe                    |   💡   |
| Asaas                     |   💡   |
| Refunds                   |   📋   |
| Chargebacks               |   📋   |

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
| Email Delivery         |   📋   |
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
| Email Provider     |   📋   |
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

* Financial Center
* Staff Portal expansion
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

Current implementation has completed the first eight product phases, covering:

* Core platform architecture
* Event creation
* Organizer event management
* Ticket workspace
* Batch management
* Publishing validation
* Consumer event discovery
* Public checkout and confirmation
* Payments foundation
* Ticket issuance foundation
* Offline validation foundation
* Organizer dashboard foundation
* Background processing
* Observability

The current product stage is late-MVP: the platform now supports the core ticketing loop from organizer event creation through publishing and consumer checkout. Remaining gaps are mostly operational depth, financial tooling, delivery channels, staff workflows, enterprise controls, growth tooling, and production hardening.

---

# Next Product Milestones

The next major milestones are:

1. Organizer Dashboard 2.0
2. Staff Portal expansion
3. Financial Center
4. Organization Management
5. Integrations
6. Growth and marketing tools
7. Wallets and ticket delivery
8. Refunds and chargebacks
9. Reserved seating
10. White Label / Enterprise capabilities

Future development expands the platform while preserving the existing architecture, CQRS boundaries, shared contracts, and business rules.
