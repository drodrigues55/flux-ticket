# Analytics Integration Testing

This document contains instructions to test the analytics provider layer.

## 1. Automated Tests
Run unit tests in the `@flux/types` package:
```bash
npm test -w packages/types
```

This verifies:
- `NoopAnalyticsProvider` is stable.
- `PostHogAnalyticsProvider` correctly sanitizes properties and formats payloads.
- `safeCapture` suppresses provider failures cleanly.
- Privacy allowlist rules strip forbidden keys.

## 2. Manual Verification
Ensure that local development does not log telemetry events in console outputs unless explicitly enabled by setting `ANALYTICS_PROVIDER=posthog`.
