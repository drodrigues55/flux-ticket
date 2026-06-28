# Post-RC1 Backlog

A tracker of deferred non-blocking items for subsequent development phases, updated after the RC1 Demo.

## Release Blockers
- None (All release-blocking items resolved).

## Demo Risks & UX Polish
- **Mock Sandbox Notice**: Add subtle header notices to dashboard and client portals indicating the active mock state of payment APIs.
- **Live Dashboard Event Creation Validation**: Keep prepared seed events as the RC1 demo default; validate live creation in each target environment before presenting it as a live demo step.

## Technical Debt
- **Docker Containerization**: Containerize all services and workers to ease environment provisioning.
- **Refresh Tokens & 2FA**: Strengthen authorization token rotations.

## Future Product Features
- **Real Payment Gateway**: Integrate Mercado Pago or Stripe credentials.
- **Real Refunds & Chargebacks**: Implement mutation endpoints and ledger balances recalculation rules.
