# Analytics Provider Contract

Flux Tickets defines an abstraction for product analytics to separate visual/business behavior monitoring from operational observability (such as structured logs and Prometheus metrics).

## The Contract (`AnalyticsProvider`)

Defined in [analytics.ts](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/packages/types/src/analytics.ts), the interface requires:

- `name`: Identifies the provider (`'noop'` or `'posthog'`).
- `identify(distinctId, properties)`: Links distinct actions to a user safely.
- `capture(input)`: Captures discrete product events with allowed properties.
- `capturePageView(path, properties)`: Tracks navigation flow without logging private URL query inputs.
- `flush()` and `shutdown()`: Flushes buffered events (used during process termination or page unloads).

## Provider Types

1. **`NoopAnalyticsProvider`**: Safe, zero-overhead dummy provider. Default for local environments, CI/CD, and test suites.
2. **`PostHogAnalyticsProvider`**: Real provider transmitting payloads via HTTPS POST requests to `POSTHOG_HOST`.

## Failure Isolations and Safe Capture

Product analytics integration is non-critical. A failure (such as network timeout, DNS outage, or rate limit from PostHog) **must never** crash core business flows (e.g., checkout, ticket issuing, or staff validation).

The helper `safeCapture` is used globally:

```typescript
export async function safeCapture(provider: AnalyticsProvider, input: AnalyticsCaptureInput) {
  try {
    await provider.capture(input);
  } catch {
    // Product analytics failures are silently swallowed so they never block transactions.
  }
}
```
