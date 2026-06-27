# Security Hardening

Summary of MVP security layers applied to the platform.

## Applied Controls
- **Rate Limiting**: Configured global and route-specific limits on reservations, checkout, and auth tokens.
- **Secure Headers**: Helm-equivalent headers (Frame Options, Content Type Sniffing, Strict Transport Security).
- **CORS Config**: Rejects non-platform domains in production.
- **Envelope Redaction**: Prevents stack traces from leaking to client responses in production mode.
