# Analytics Provider Contract

Flux Tickets defines an `AnalyticsProvider` interface in `@flux/types` to encapsulate product analytics actions without coupling packages directly to PostHog.

## 1. Provider Interface
```typescript
export interface AnalyticsProvider {
  name: 'noop' | 'posthog';
  identify(distinctId: string, properties?: AnalyticsProperties): Promise<void>;
  capture(input: AnalyticsCaptureInput): Promise<void>;
  capturePageView(path: string, properties?: AnalyticsProperties): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}
```

## 2. Safe Capture Boundaries
All analytics operations use the `safeCapture` helper:
- Exceptions thrown by the network or analytics provider are swallowed.
- Failing analytics requests must **never** block primary checkout or validation flows.

## 3. Data Privacy Rules
- The library uses an allowed properties set (`ALLOWED_ANALYTICS_PROPERTIES`) and a forbidden properties set (`FORBIDDEN_ANALYTICS_PROPERTIES`) to strictly filter properties before forwarding them to PostHog.
- CPF, ticket signatures, QR payloads, and raw billing details are strictly removed.
