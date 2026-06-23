# Release Process & Continuous Integration

This document defines the release pipeline and QA execution strategy for the Flux Tickets platform.

## Continuous Integration (CI) Pipeline

1. **On Every Commit (Pre-commit / Pre-push)**
   - Code Linting (`eslint`)
   - Type Checking (`tsc`)
   - Isolated Unit Tests (Zod schemas, utilities)

2. **On Every Pull Request (Feature branch to Main)**
   - Full Integration Suite (Backend API & Frontend Components)
   - API Contract Testing
   - E2E Smoke Tests (Core happy paths)

3. **Before Staging (Merge to Main)**
   - Full E2E Test Suite
   - Database Migration Validation (Dry run Prisma schemas)
   - Accessibility Audits (Automated axe-core run)

4. **Before Production (Release Trigger)**
   - Full Regression Suite (Strict pass required)
   - Manual QA Sanity Check (See Checklist below)
   - Performance Baseline Check (Verify latency regressions)

## Manual QA Checklist

Before any major release to production, the following manual steps must be verified by a QA engineer:

- [ ] **Cross-Browser Verification**: Ensure UI renders correctly on Chrome, Safari, Firefox, and Edge.
- [ ] **Mobile Responsiveness**: Verify the Organizer Dashboard and Consumer Checkout on mobile viewports.
- [ ] **Accessibility Walkthrough**: Perform a full checkout flow using only a keyboard and a screen reader.
- [ ] **Staff PWA Offline Test**: Load the Staff PWA on a physical device, disable internet (airplane mode), scan a QR code, and verify sync behavior upon reconnecting.
- [ ] **Payment Sandbox**: Run a mock transaction through the payment gateway to ensure webhook processing succeeds.
