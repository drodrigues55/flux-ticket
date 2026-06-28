# Known Limitations

A list of out-of-scope/mock features in the Release Candidate 1.

## Excluded Capabilities
- **No Real Payment Gateway**: The checkout flow invokes `PAYMENT_PROVIDER=MOCK` to simulate outcomes.
- **Limited External API Calls**: Payment remains mock. Transactional email can call Resend only when `EMAIL_PROVIDER=resend` and required credentials are configured; otherwise email uses the mock provider.
- **No Real Refund/Chargeback**: Manual intervention required.
- **No Reserved Seating**: Simple capacity counters only.
- **No White Label or Branding Options**: Standard theme templates.
- **No Native Mobile App**: Staff portal utilizes standard PWA capabilities.
- **No AI Analytics**: Calculations utilize deterministic scoring rules.
