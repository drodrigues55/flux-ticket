# Testing Strategy

This document outlines the standard testing strategy for the Flux Tickets platform. It defines the responsibilities of each testing layer to prevent duplicated coverage and ensure robust business workflows.

## The Testing Pyramid

Our strategy follows a strict pyramid structure:

1. **Unit Tests (Jest/Vitest)**
   - Validate isolated functions, utility helpers, Zod schemas, and individual database queries.
   - Example: Testing that `moneySchema` rejects negative values.

2. **Integration Tests (React Testing Library / Backend Jest)**
   - Validate component composition and local API behavior.
   - Example: Ensuring the `<Wizard>` correctly blocks navigation when a step is invalid. Ensure the `ticket-worker` correctly processes a mock queue payload.

3. **End-to-End Tests (Playwright/Cypress)**
   - Validate full user journeys in an automated browser environment against a real (or staging) database.
   - Example: Logging in, creating an event with ticket types and batches, and publishing it.

4. **Regression Suite**
   - A curated subset of E2E and Integration tests that guarantee core revenue-generating flows (Checkout, Check-in) remain completely functional. No deployment is allowed if these fail.

5. **Performance Testing (k6 / JMeter)**
   - Validate system behavior under heavy load (e.g., 500 concurrent reservations hitting Redis locks).

6. **Accessibility Testing (axe-core)**
   - Ensure the UI follows WCAG 2.2 AA standards, focusing on keyboard navigation and screen reader support.

## Component Specific Verification

### Form System
- Test Zod schemas entirely in isolation.
- Integration tests must verify `react-hook-form` logic, specifically checking dirty states and dynamic array functionality.
- Ensure all custom fields (`<TextField>`, `<SelectField>`) bind correctly to the form context and propagate errors.

### Wizard System
- Verify state preservation across re-renders and routes.
- Test unsaved changes dialogs via native `beforeunload` events.
- Ensure strict progression validation (cannot skip required steps).

### Core Business Logic
- The **Checkout Flow** is our most critical path. Automated tests must continuously ensure that changes to the Event/Ticket hierarchy do not break backwards compatibility with legacy events.
- **Worker Queues** must be tested for retries, idempotency, and dead-letter queue routing.
