# PostHog Setup & Configuration

This guide covers setting up and administering PostHog product analytics inside Flux Tickets.

## Environment Variables

Enable PostHog by configuring these environment variables:

| Variable | Scope / Context | Description |
|---|---|---|
| `ANALYTICS_PROVIDER` | Backend (`api-write`) | Set to `posthog` to enable real analytics, or `noop` to disable. |
| `POSTHOG_API_KEY` | Backend (`api-write`) | Your PostHog project api key. |
| `POSTHOG_HOST` | Backend (`api-write`) | Target host url (e.g. `https://us.i.posthog.com` or custom proxy). |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | Frontend apps (`client`, `dashboard`, `staff-pwa`) | Frontend indicator to activate client-side tracking. |
| `NEXT_PUBLIC_POSTHOG_KEY` | Frontend apps (`client`, `dashboard`, `staff-pwa`) | Public API key exposed to the browser. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Frontend apps (`client`, `dashboard`, `staff-pwa`) | Public host for frontend event routing. |

## Privacy boundaries

We run a strict whitelist sanitizer on all analytics payloads to prevent leakages of personally identifiable information (PII) or sensitive credentials.

### Allowed Properties (Whitelist)
- `amount`, `batchId`, `blockerCount`, `currency`, `eventId`, `eventSlug`, `organizationId`, `operatorId`, `provider`, `reason`, `requestId`, `role`, `status`, `syncCount`, `ticketTypeId`, `validationResult`.

### Forbidden Properties (Blacklist/Ignored)
- `cpf`, `buyerCpf`, `holderCpf`, `qr`, `qrPayload`, `payload`, `rawPayload`, `rawResponse`, `signature`, `hmacSignature`, `token`, `inviteToken`, `cardNumber`, `cvv`, `fullName`, `name`, `email`.

Any property not present on the whitelist or explicitly defined in the forbidden list is filtered out before dispatch.
