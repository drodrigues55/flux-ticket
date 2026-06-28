# Analytics Testing Strategy

This page documents how product analytics are tested to ensure privacy constraints are respected and failures do not cause disruptions.

## Automated Testing

Unit tests for the analytics provider abstraction are defined in [index.test.ts](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/packages/types/src/index.test.ts).

### Provider Tests

1. **Noop Provider Safety**: Verifies that `NoopAnalyticsProvider` behaves correctly and exposes the exact same methods as the actual provider without side effects or raising exceptions.
2. **PostHog Integration and Fetch Mapping**: Verifies that `PostHogAnalyticsProvider` serializes events correctly and outputs them to the network layer.
3. **Graceful Failures**: Verifies that when a network failure occurs (e.g. 500 status response from the analytics host), the `safeCapture` wrapper catches the error and allows the request or transaction flow to complete uninterrupted.

### Privacy and Allowlist Validation

We assert that forbidden properties (such as attendee CPFs, invitation tokens, and decrypted QR codes) are discarded:
- `sanitizeAnalyticsProperties` filters out non-whitelisted keys.
- Unit tests verify that keys like `cpf`, `rawPayload`, and `email` are not sent to PostHog.
