# KPIs

> Status: Active
> Last Updated: June 2026

---

# Overview

The dashboard KPIs are backend-calculated values derived from transactional tables and exposed through the dashboard overview contract.

They are computed in `services/api-read/src/dashboard/dashboard.service.ts` and rendered in `apps/dashboard/src/pages/index.tsx`.

The frontend never derives KPIs from raw tables or client-side heuristics.

---

# Current KPIs

## Gross Revenue

Calculated from approved payments across the organizer's events.

Used in:

- overview totals
- Hero Event summary
- attention cards
- dashboard chart context

## Tickets Sold

Calculated from sold tickets across batches and events.

Used in:

- overview totals
- Hero Event summary
- batch performance
- occupancy calculations

## Average Ticket

Calculated as gross revenue divided by tickets sold.

The dashboard uses it as a compact financial health indicator.

## Occupancy

Calculated from tickets sold divided by total capacity.

It is displayed as a percentage and contributes to priority scoring and alerts.

## Check-ins

Calculated from accepted check-ins.

It is used to reflect event execution progress and operational health.

## Priority Score

Calculated per event from multiple backend signals:

- days remaining
- occupancy
- capacity target
- low stock
- critical alerts
- warning alerts
- sales trend

The score drives hero selection and event ranking.

## Sales Trend 7d

Calculated from the difference between the last 7 days and the previous 7-day window of approved payment value.

Used to detect accelerating or slowing demand.

---

# KPI Sources

The KPI contract is backed by these implementation sources:

- `dashboard.service.ts` for aggregation and scoring
- `apps/dashboard/src/pages/index.tsx` for display and formatting
- `packages/types/src/index.ts` for typed response shapes
- `packages/database/prisma/schema.prisma` for the underlying transactional data model

---

# Display Rules

- KPIs are presented as read-only values
- Currency values are formatted in BRL
- Percentages are displayed as integers unless the UI explicitly needs precision
- Priority-related KPIs are sorted by backend score, not by frontend preference

---

# Non-Goals

This document does not define future predictive or ML-based KPIs.

If a metric is not already sourced from the current dashboard backend contract, it does not belong here yet.

