# Known Limitations

A list of out-of-scope/mock features in the Release Candidate 1.

## Excluded Capabilities
- **No Real Payment Gateway**: The checkout flow invokes `PAYMENT_PROVIDER=MOCK` to simulate outcomes.
- **No External API Calls**: The platform operates in isolation. Webhooks and notifications are local queue simulations.
- **No Real Refund/Chargeback**: Manual intervention required.
- **No Reserved Seating**: Simple capacity counters only.
- **No White Label or Branding Options**: Standard theme templates.
- **No Native Mobile App**: Staff portal utilizes standard PWA capabilities.
- **No AI Analytics**: Calculations utilize deterministic scoring rules.
