# Dashboard Command Center Testing

This document details the test suites created to verify the operational command center metrics, scoring engine, and interactive page layouts.

## Test Coverage

### 1. Score Calculation (`services/api-read`)
- Verifies that draft events prioritize setup issues (like missing tickets) rather than ticket velocity metrics.
- Confirms critical payment and sync conflicts correctly raise priority scores above attention bounds.

### 2. Rendering constraints (`apps/dashboard`)
- Verifies that static KPI values (Gross Revenue, average ticket, etc.) are explicitly non-clickable.
- Confirms action links correctly resolve to corresponding sub-routes (check-in portal, finance ledger, etc.).
