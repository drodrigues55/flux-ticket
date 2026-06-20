# Pricing

> Status: Draft
> Last Updated: June 2026

---

# Overview

Pricing is not implemented in the current codebase as a live billing or subscription system.

This document therefore stays product-level and should be used to frame future commercial packaging, not current runtime behavior.

---

# Current State

The platform currently exposes product capabilities without a documented billing engine in the repository.

That means this doc should not pretend there is:

- live subscription enforcement
- seat-based billing
- automated invoice generation
- usage-based metering

---

# Recommended Packaging Axes

When pricing is defined, it should likely be organized around:

- event volume
- organizer count
- operational features
- support tier
- payment or wallet add-ons

Those axes are product decisions and should be confirmed separately from implementation work.

---

# Constraint

Any eventual pricing model must remain compatible with the current product boundaries:

- consumer sale flow
- organizer dashboard
- staff PWA
- asynchronous backend processing

Until pricing is formally defined, this doc should remain a placeholder with clear boundaries instead of invented numbers.

