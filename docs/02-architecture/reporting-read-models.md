# Reporting & Read Models Architecture

Flux Tickets separates transactional mutations from reporting read projections to keep query latency low.

## 1. Schema Breakdown
- **Order gross/net amounts**: Aggregated dynamically to feed gross revenue and estimated net stats.
- **Estimated Net**: Derived from mock payment pricing subtracting default processing fees (e.g. 10% platform fee estimates).
- **Payment Log Projections**: Recorded at order payout state changes to preserve transaction snapshots for dashboard cards.

## 2. Mock Disclaimers
All reporting metrics carry explicit labels notifying organizers that payouts are simulated/estimated and do not represent actual bank settlement data.
