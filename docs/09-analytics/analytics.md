# ANALYTICS

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Analytics module transforms transactional business data into actionable operational insights.

Unlike transactional APIs, which answer **what happened**, Analytics answers:

- What is happening?
- Why is it happening?
- What needs attention?
- What should happen next?

Analytics powers the Organizer Dashboard and future administrative tools.

---

# Objectives

Analytics is responsible for:

- Business KPIs
- Event prioritization
- Operational alerts
- Revenue analysis
- Sales trends
- Occupancy analysis
- Check-in analysis
- Lot performance
- Future forecasting

Analytics never modifies business state.

---

# Data Sources

Analytics consumes transactional data from:

```text
Event

TicketBatch

Ticket

Payment

Checkin

Reservation

TicketStatusHistory

AuditLog
```

No analytics-specific data is entered manually.

---

# Design Principles

The Analytics module follows these principles:

- Backend-owned calculations
- Read-only
- Deterministic
- Reproducible
- Explainable
- Eventually optimized

Frontend applications never calculate KPIs.

---

# Architecture

```text
Transactional Database

↓

Analytics Service

↓

Dashboard Endpoints

↓

Organizer Dashboard
```

Business calculations remain centralized.

---

# Current Endpoints

Current analytics endpoints:

```http
GET /dashboard/overview

GET /dashboard/priority-event

GET /dashboard/events-priority

GET /dashboard/events/:eventId/lots-performance

GET /dashboard/alerts
```

Each endpoint returns a standardized Phase 1 response envelope.

---

# Dashboard Overview

The overview endpoint provides high-level KPIs.

Examples include:

- Gross Revenue
- Tickets Sold
- Average Ticket
- Occupancy
- Check-ins
- Recent Sales
- Operational Controls

Overview aggregates data across the organizer's events.

---

# Priority Event

The platform identifies the most operationally relevant event.

Selection is based on the Priority Score.

Only one event is considered the current Hero Event.

---

# Hero Event

The Hero Event is the event requiring the greatest operational attention.

It is not necessarily:

- the largest event
- the newest event
- the highest revenue event

Priority is calculated from multiple business signals.

---

# Priority Score

Priority Score combines several indicators.

Examples include:

- Sales velocity
- Occupancy
- Event proximity
- Pending operational issues
- Check-in progress

Higher scores indicate greater operational relevance.

---

# Events Priority

The endpoint:

```http
GET /dashboard/events-priority
```

returns all organizer events sorted by Priority Score.

Sorting occurs entirely in the backend.

---

# Lot Performance

Lot performance measures how each batch performs.

Current metrics include:

- Tickets sold
- Occupancy
- Remaining inventory
- Revenue contribution

Future metrics may include conversion rates and sell-through velocity.

---

# Operational Alerts

Alerts identify situations requiring organizer attention.

Examples:

- Low inventory
- High occupancy
- Pending approvals
- Upcoming event
- Unexpected sales slowdown

Alerts are generated dynamically from business data.

---

# KPI Philosophy

Every KPI should satisfy three rules.

It must be:

- measurable
- reproducible
- explainable

No "black box" metrics should appear in the dashboard.

---

# Backend Responsibility

Analytics calculations belong exclusively to backend services.

Frontend responsibilities are limited to:

- requesting data
- displaying charts
- formatting values
- filtering views

Business calculations never occur in React.

---

# Event Scope

Every dashboard request is scoped to the authenticated organizer.

Analytics never expose information belonging to other organizers.

RBAC rules apply to every endpoint.

---

# Data Freshness

Current analytics are generated directly from transactional data.

Benefits:

- always current
- no synchronization delay
- no duplicated storage

Future optimization may introduce materialized views without changing API contracts.

---

# Performance Considerations

As data volume increases, optimization strategies include:

- SQL aggregation
- indexed queries
- materialized views
- cached metrics
- scheduled rollups

Current implementation favors correctness over pre-aggregation.

---

# Current KPIs

Current dashboard KPIs include:

- Gross Revenue
- Tickets Sold
- Average Ticket
- Occupancy
- Check-ins
- Priority Score
- Lot Performance
- Operational Alerts

Additional KPIs may be introduced without breaking existing contracts.

---

# Future KPIs

Planned additions include:

- Conversion Rate
- Refund Rate
- Sales by Channel
- Revenue by Period
- Customer Retention
- Repeat Buyers
- Campaign Performance
- Marketing Attribution

These metrics belong to future modules.

---

# Next Section

Part 2 documents:

- Analytics architecture
- Dashboard widgets
- Future prediction engine
- AI insights
- Materialized metrics
- Performance optimization
- Long-term analytics roadmap

---
---

# Analytics Architecture

The Analytics module is intentionally isolated from transactional business logic.

Its responsibility is to transform transactional data into read-optimized information.

Architecture:

```text
PostgreSQL

↓

Analytics Queries

↓

Read Models

↓

Dashboard Endpoints

↓

Organizer Dashboard
```

Analytics never modifies business entities.

---

# Read Models

Dashboard endpoints should return complete read models.

Example:

```json
{
  "eventId": "...",
  "priorityScore": 92,
  "occupancy": 81.4,
  "grossRevenue": 183420,
  "alerts": [...]
}
```

The frontend should never assemble multiple requests into a KPI.

---

# Widget Architecture

Each dashboard widget consumes one backend contract.

Example:

```text
Hero Card

↓

/dashboard/priority-event
```

```text
Alerts

↓

/dashboard/alerts
```

```text
Lot Performance

↓

/dashboard/events/:id/lots-performance
```

Widgets should remain independent.

---

# Dashboard Philosophy

The dashboard is data-driven.

The frontend is responsible only for:

- layout
- rendering
- formatting
- interactions

The backend is responsible for:

- aggregation
- calculations
- ranking
- prioritization

---

# Business Metrics

Business metrics originate from transactional events.

Examples:

```text
Reservation Created

↓

Reservation Counter
```

```text
Payment Approved

↓

Revenue Counter
```

```text
Check-in Accepted

↓

Attendance Counter
```

Metrics should never be entered manually.

---

# Materialized Metrics

Current implementation calculates KPIs directly from transactional tables.

Future optimization may introduce:

```text
Materialized Views

↓

Dashboard Reads
```

Possible materialized datasets:

- Daily Revenue
- Hourly Sales
- Event Occupancy
- Organizer Summary
- Check-in Summary

Public API contracts remain unchanged.

---

# Analytics Aggregation

Future queue:

```text
analytics.aggregate
```

Responsibilities:

- update summary tables
- compute rolling metrics
- refresh materialized views

Aggregation remains asynchronous.

---

# Time Series

Future dashboards should expose:

- hourly sales
- daily sales
- weekly sales
- monthly sales
- yearly revenue

Time-series calculations belong entirely to backend services.

---

# Sales Velocity

Sales velocity measures:

```text
Tickets Sold

/

Time
```

It helps identify:

- accelerating events
- slowing demand
- potential sell-outs

Velocity is one component of the Priority Score.

---

# Occupancy

Occupancy measures:

```text
Tickets Sold

/

Available Capacity
```

Displayed as a percentage.

Occupancy contributes to operational alerts.

---

# Ticket Average

Average ticket value is calculated as:

```text
Gross Revenue

/

Approved Orders
```

Refunds may be incorporated in future financial dashboards.

---

# Check-in Metrics

Attendance metrics include:

- Expected Audience
- Checked In
- Remaining Audience
- Attendance Percentage

These values update as check-ins are synchronized.

---

# Financial Metrics

Future financial metrics include:

- Net Revenue
- Pending Revenue
- Settled Revenue
- Refunds
- Chargebacks
- Platform Fees
- Organizer Transfers

These belong to the future Finance module.

---

# Marketing Metrics

Future marketing analytics include:

- UTM Performance
- Campaign Conversion
- Referral Performance
- Affiliate Revenue
- Promoter Sales
- Pixel Attribution

Marketing metrics remain isolated from transactional services.

---

# Predictive Analytics

Future prediction engine may estimate:

- Sell-out probability
- Revenue forecast
- Attendance forecast
- Queue demand
- Staffing requirements

Predictions should never replace transactional truth.

---

# AI Insights

Future AI-generated insights may identify:

- underperforming events
- unusual sales behavior
- declining occupancy
- pricing opportunities
- marketing recommendations

AI suggestions remain advisory.

Business decisions stay under organizer control.

---

# Performance Optimization

Recommended optimization strategy:

Current:

```text
Transactional Queries
```

Intermediate:

```text
Indexed Aggregation
```

Advanced:

```text
Materialized Views
```

Large Scale:

```text
Precomputed Analytics Tables
```

API contracts should remain stable throughout these changes.

---

# Security

Analytics must respect organizer isolation.

Every query is scoped to:

```text
Authenticated Organizer
```

Cross-organizer aggregation is prohibited.

Administrative dashboards use dedicated endpoints.

---

# Testing Strategy

Analytics should be validated through:

- KPI correctness
- query performance
- dashboard contracts
- authorization
- aggregation accuracy
- regression testing

Each KPI should produce deterministic results from identical transactional data.

---

# Future Roadmap

Planned analytics capabilities include:

- Daily rollups
- Materialized views
- Forecasting
- AI recommendations
- Revenue prediction
- Demand prediction
- Dynamic dashboard layouts
- Executive reporting
- Administrative analytics

These additions build upon the current read-model architecture without requiring changes to frontend contracts.

---

# Analytics Principles

The Analytics module guarantees:

- backend-owned calculations
- deterministic KPIs
- read-only execution
- scalable architecture
- explainable metrics
- future-ready optimization

It transforms transactional data into meaningful operational intelligence while preserving a strict separation between business execution and business analysis.

---

# ANALYTICS Complete

Together, Parts 1 and 2 define the complete analytics architecture of Flux Tickets, covering dashboard read models, KPI generation, aggregation strategy, future predictive capabilities, and long-term scalability.

---
