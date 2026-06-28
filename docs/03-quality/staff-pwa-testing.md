# Staff PWA Validation Procedures

This document outlines tests to verify gate validation and device registry operations.

## 1. Automated Unit Tests
- Execute test suites on the `staff-pwa` package:
  ```bash
  npm test -w apps/staff-pwa
  ```
- These tests verify ticket validation rules, offline queue management, signature comparison, and operator audit metadata additions.

## 2. Sync & Validation Tests
- Validate offline mutations and online batch sync integrations:
  ```bash
  npm test -w services/api-write
  ```
- Tests cover device registry in Redis and disabled device blockages.
