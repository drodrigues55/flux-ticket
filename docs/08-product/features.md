# Features

> Version: 2.0
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

# Core Platform

| Feature               | Status |
| --------------------- | :----: |
| Monorepo Architecture |   ✅   |
| Shared Packages       |   ✅   |
| PostgreSQL            |   ✅   |
| Redis                 |   ✅   |
| BullMQ Workers        |   ✅   |
| Outbox Pattern        |   ✅   |
| Request ID            |   ✅   |
| Structured Logging    |   ✅   |
| AuditLog              |   ✅   |
| TicketStatusHistory   |   ✅   |

---

# Authentication

| Feature                           | Status |
| --------------------------------- | :----: |
| Organizer Authentication          |   🚧   |
| Staff Identification (Name + CPF) |   ✅   |
| Customer Checkout Without Account |   ✅   |
| JWT Authentication                |   ✅   |
| Role Based Access Control         |   ✅   |
| Refresh Tokens                    |   📋   |
| Password Recovery                 |   📋   |
| Two-Factor Authentication         |   💡   |
| Device Registration               |   📋   |

---

# Organizer Dashboard

| Feature             | Status |
| ------------------- | :----: |
| Dashboard Overview  |   ✅   |
| Hero Event          |   ✅   |
| Priority Events     |   ✅   |
| Operational Alerts  |   ✅   |
| Lot Performance     |   ✅   |
| Revenue Cards       |   🚧   |
| Export Reports      |   📋   |
| Financial Dashboard |   📋   |
| Organizer Settings  |   📋   |

---

# Organizer Portal

| Feature            | Status |
| ------------------ | :----: |
| Event List         |   📋   |
| Event Search       |   📋   |
| Event Filters      |   📋   |
| Event Detail Shell |   📋   |
| Draft Management   |   📋   |
| Duplicate Event    |   📋   |
| Archive Event      |   📋   |
| Delete Draft Event |   📋   |

---

# Event Creation Workflow

| Feature                  | Status |
| ------------------------ | :----: |
| Event Creation Wizard    |   ✅   |
| Basic Information Step   |   ✅   |
| Minimal Ticket Step      |   ✅   |
| Review Step              |   ✅   |
| Save Draft               |   ✅   |
| Ready For Validation     |   ✅   |
| Full Publishing Workflow |   📋   |

---

# Event Management

| Feature                        | Status |
| ------------------------------ | :----: |
| Create Event                   |   ✅   |
| Edit Event                     |   ✅   |
| Publishing Entry Point         |   ✅   |
| Publish Event                  |   📋   |
| Publishing Validation Workflow |   📋   |
| Archive Event                  |   📋   |
| Cancel Event                   |   📋   |
| Event Banner                   |   📋   |
| Event Categories               |   📋   |
| Event Tags                     |   💡   |

---

# Ticket Workspace

| Feature                 | Status |
| ----------------------- | :----: |
| Ticket Type Workspace   |   📋   |
| Ticket Type Information |   📋   |
| Ticket Type CRUD        |   📋   |
| Duplicate Ticket Type   |   📋   |
| Archive Ticket Type     |   📋   |
| Ticket Capacity         |   📋   |
| Purchase Limits         |   📋   |
| Refundable Tickets      |   📋   |
| Transferable Tickets    |   📋   |

---

# Ticket Batches

| Feature                           | Status |
| --------------------------------- | :----: |
| Multiple Batches                  |   ✅   |
| Batch Inventory                   |   ✅   |
| Batch Visibility                  |   ✅   |
| Sales Window                      |   ✅   |
| Default Batch From Event Creation |   ✅   |
| Batch CRUD UI                     |   📋   |
| Batch Duplication                 |   📋   |
| Batch Reordering                  |   📋   |
| Batch Preview                     |   📋   |
| Batch Validation                  |   📋   |
| Manual Batch Progression          |   📋   |
| Sector Support                    |   🚧   |
| Dynamic Pricing                   |   💡   |

---

# Checkout

| Feature                   | Status |
| ------------------------- | :----: |
| Reservation               |   ✅   |
| Reservation Expiration    |   ✅   |
| Inventory Lock            |   ✅   |
| Checkout Flow             |   ✅   |
| Multiple Payment Attempts |   ✅   |
| Abandoned Cart Recovery   |   🚧   |
| Guest Checkout            |   ✅   |
| Customer Account          |   📋   |

---

# Payment Engine

| Feature                   | Status |
| ------------------------- | :----: |
| PaymentProvider Interface |   ✅   |
| Mock Payment Provider     |   ✅   |
| Pending Payments          |   ✅   |
| Approved Payments         |   ✅   |
| Failed Payments           |   ✅   |
| Expired Payments          |   ✅   |
| Payment Recovery Worker   |   ✅   |
| Mercado Pago              |   📋   |
| Stripe                    |   💡   |
| Asaas                     |   💡   |
| Refunds                   |   📋   |
| Chargebacks               |   📋   |

---

# Ticket Engine

| Feature                   | Status |
| ------------------------- | :----: |
| Ticket Generation         |   ✅   |
| Immutable Ticket Identity |   ✅   |
| QR Generation             |   ✅   |
| HMAC Signature            |   ✅   |
| TicketStatusHistory       |   ✅   |
| Ticket Validation         |   ✅   |
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
| Offline Bundle      |   ✅   |
| IndexedDB Storage   |   ✅   |
| Offline Validation  |   ✅   |
| Offline Queue       |   ✅   |
| Synchronization     |   🚧   |
| Conflict Resolution |   🚧   |
| Camera Scanner      |   📋   |
| Staff Login         |   📋   |
| Device Registration |   📋   |

---

# Waitlist

| Feature               | Status |
| --------------------- | :----: |
| Join Waitlist         |   ✅   |
| FIFO Processing       |   ✅   |
| Worker Invitations    |   🚧   |
| Invitation Expiration |   📋   |
| Automatic Promotion   |   📋   |

---

# Notifications

| Feature            | Status |
| ------------------ | :----: |
| Notification Queue |   ✅   |
| Email Provider     |   📋   |
| WhatsApp Provider  |   📋   |
| SMS Provider       |   💡   |
| Push Notifications |   💡   |

---

# Analytics

| Feature            | Status |
| ------------------ | :----: |
| Overview KPIs      |   ✅   |
| Priority Event     |   ✅   |
| Operational Alerts |   ✅   |
| Revenue Metrics    |   🚧   |
| Occupancy Metrics  |   ✅   |
| Sales Trends       |   📋   |
| Forecasting        |   📋   |
| AI Insights        |   💡   |

---

# Security

| Feature           | Status |
| ----------------- | :----: |
| JWT               |   ✅   |
| RBAC              |   ✅   |
| AuditLog          |   ✅   |
| HMAC QR           |   ✅   |
| Request IDs       |   ✅   |
| Idempotency       |   🚧   |
| Distributed Locks |   🚧   |
| Rate Limiting     |   📋   |
| Secret Rotation   |   📋   |

---

# Infrastructure

| Feature          | Status |
| ---------------- | :----: |
| PostgreSQL       |   ✅   |
| Redis            |   ✅   |
| BullMQ           |   ✅   |
| Health Endpoints |   ✅   |
| Metrics          |   ✅   |
| Sentry           |   🚧   |
| Docker           |   📋   |
| Kubernetes       |   💡   |

---

# Observability

| Feature             | Status |
| ------------------- | :----: |
| Structured Logs     |   ✅   |
| Request Correlation |   ✅   |
| Queue Metrics       |   ✅   |
| Health Checks       |   ✅   |
| Prometheus          |   ✅   |
| Grafana Dashboards  |   📋   |
| Alert Manager       |   📋   |

---

# Testing

| Feature           | Status |
| ----------------- | :----: |
| Prisma Validation |   ✅   |
| Smoke Tests       |   ✅   |
| Queue Validation  |   🚧   |
| Concurrency Tests |   🚧   |
| Performance Tests |   📋   |
| Load Testing      |   📋   |
| Chaos Testing     |   💡   |

---

# Future Roadmap

Planned platform capabilities include:

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

Current implementation focuses on delivering a complete MVP centered around:

* Event creation
* Organizer event management
* Checkout
* Payments
* Ticket issuance
* Offline validation
* Organizer dashboard
* Background processing
* Observability

The current product stage is mid-MVP: the platform foundation and transaction engine are strong, while organizer management, publishing validation, ticket workspace, public consumer experience, delivery, and financial tooling remain under active planning or future implementation.

---

# Next Product Milestones

The next major milestones are:

1. Organizer Portal
2. Ticket Workspace
3. Batch Management UI
4. Publishing Validation Workflow
5. Consumer Portal improvements
6. Staff Portal expansion
7. Financial Center
8. Organization Management
9. Integrations
10. Growth and marketing tools

Future development expands the platform while preserving the existing architecture, CQRS boundaries, shared contracts, and business rules.
