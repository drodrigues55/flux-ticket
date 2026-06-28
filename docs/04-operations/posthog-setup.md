# PostHog Setup and Integration

This guide details configuring and operations of PostHog Product Analytics.

## 1. Environment Configurations
Configure the following env variables to enable analytics in staging or production:
- `ANALYTICS_PROVIDER=posthog`
- `POSTHOG_API_KEY=phc_***` (Server-side key)
- `POSTHOG_HOST=https://us.i.posthog.com` (Defaults to `https://app.posthog.com`)
- `NEXT_PUBLIC_ANALYTICS_PROVIDER=posthog` (For client next.js)
- `NEXT_PUBLIC_POSTHOG_KEY=phc_***`
- `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`

If these variables are missing, the system automatically falls back to `NoopAnalyticsProvider` to prevent failures.

## 2. Distinction between Client & Server Logs
- **Client Logs**: Track page navigation and frontend funnel click events (e.g. ticket selection, checkout details).
- **Server Logs**: Track checkout mutations, outbox worker steps, or registration confirmations.
