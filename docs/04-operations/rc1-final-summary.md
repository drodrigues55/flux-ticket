# RC1 Final Summary

Final browser walkthrough summary for Release Candidate 1.

## Summary Status

- **Final RC1 Status**: **Demo Ready with Known Risks**
- **Manual QA Date**: 2026-06-28
- **Completed Scope**: Phases 1-15 remain the declared RC1 scope: ticketing, checkout, staff gate validation, financial centers, priority alerts, and teams RBAC.
- **Automated Validation**: Prior QA-1, QA-2, and QA-3 validation was already completed before this pass. Broad automated cycles were not repeated except for targeted builds after blocker fixes.
- **Manual QA Checklist**: Browser walkthrough results are recorded in `docs/03-quality/manual-qa-results-rc1.md`.
- **Blockers Fixed During Walkthrough**: 2.
- **Known Limitations**: Real gateway, refunds, chargebacks, coupons, reserved seating, white label, public API, native mobile apps, AI forecasting, settlement engine, tax automation, invoices, and advanced BI remain out of RC1.

## Demo Blockers Fixed

| Area | Blocker | Fix |
| --- | --- | --- |
| Client catalog | Public events may have `slug: null`; catalog CTA could fail to reach an event page. | Catalog now falls back to `/event/{id}` when no slug exists. |
| Staff PWA | Staff PWA event selection called `/api/events`, but the PWA had no index API route. | Added a minimal PWA `/api/events` proxy to the read backend public events endpoint. |

## Staff PWA Risk Fix Pass

The Staff PWA was revalidated on the default demo port `http://localhost:3000`.

Root cause of the prior `500`: the default dev server had stale/corrupted `.next` artifacts after `next build` was run while `next dev` was still serving the app. Stopping the PWA dev server, clearing `apps/staff-pwa/.next`, and restarting `next dev -p 3000` restored the app and `/api/events` to `200`.

Runtime fixes applied:

- Sync gate no longer calls staff mutation when the offline queue is empty; it can proceed directly to downloading offline signatures.
- Sync gate preserves `sectorId` from `/staff-sync` records.
- QR simulator is open by default for demo, and success/error panels expose stable visible state for validation.

Validated result:

- Staff PWA loaded on `localhost:3000`.
- Event list loaded through `/api/events`.
- Bee Gees event selected with operator identity.
- Sync gate cleared through `/staff-sync` 200.
- Simulated valid QR showed `Acesso Liberado!`.
- Offline check-in queue synced through `/staff-mutation` 200.
- Simulated adulterated QR showed `Acesso Recusado! Assinatura inválida`.

## Official Demo Path

The official RC1 demo should use the stable browser-verified path:

1. Public catalog loads.
2. Public event detail opens.
3. Ticket sector and batch can be selected.
4. Checkout creates an active reservation.
5. Mock card payment completes.
6. Success page shows approved purchase.
7. Direct ticket page shows a VALID ticket with QR/wallet/PDF actions.
8. Staff PWA opens, lists events, sync gate can be cleared, and QR simulator validates both accepted and adulterated states.
9. Finance overview loads with mock-provider limitations visible.
10. Dashboard command center loads as operational visibility over current demo data.
11. Known limitations are stated explicitly at close.

## Dashboard Demo Fallback

Use an existing public demo event for the purchase and validation loop. If dashboard event creation returns `Invalid event input`, or if the organizer workspace cannot open a public seed event, skip live event creation and continue with the prepared public event.

Event creation and publishing UI should be described as part of the dashboard surface, not as the primary live RC1 demo path unless prepared organizer demo data is loaded beforehand. The RC1 demo focuses on the verified public purchase, ticket access, staff validation, finance overview, and command-center loop.

## Finance Demo Note

The finance center should be presented with this limitation:

> Mock payment mode: financial values are for MVP/demo validation only. Real gateway settlement is not connected.

The dashboard finance UI already displays an estimated-values/mock-provider notice. Do not present finance values as real payout, settlement, tax, invoice, refund, or chargeback data.

## Known Risks For Demo

| Classification | Risk | Demo Guidance |
| --- | --- | --- |
| Demo Risk | Dashboard organizer event list is empty in the current local dataset, while public seed events exist. | Do not claim the public seed event can be edited in the organizer workspace unless a dashboard fixture is prepared. |
| Demo Risk | Dashboard event creation may require prepared/demo data; live creation returned `Invalid event input` during walkthrough. | Use an existing public demo event; skip live creation if validation fails. |
| Demo Risk | Publishing checklist routes load, but public seed event IDs return `Event not found` in dashboard organizer routes. | Treat publishing checklist as available UI, but do not demo it against public seed IDs. |
| Demo Risk | Finance values are mock/demo-only until real gateway integration; local checkout may not update dashboard finance totals. | Present finance as MVP visibility, not real settlement or payout data. |
| Demo Risk | Dashboard command-center data may depend on seeded/demo states. | Present it as operational visibility over the current demo dataset. |
| Demo Risk | Clean client/PWA instances may require clearing `.next` if production builds were run while dev servers were active. | Before demo, stop old dev servers before running builds; if a dev server returns 500, clear that app's generated `.next` folder and restart. |
| Demo Risk | Production deployment was not executed in this manual pass. | Present RC1 as local/staging validated unless a separate deployment pass is completed. |
| Post-RC1 Polish | Next `legacyBehavior` warnings appear in dashboard console. | Non-blocking for RC1; schedule after demo. |
| Post-RC1 Polish | Some legacy event/staff UI controls are icon-only or use older dark styling. | Non-blocking for RC1; schedule UI polish after demo. |

## Known Limitations

These are intentionally not included in RC1 and should not be implied during demo:

- Real payment gateway settlement.
- Refunds and chargebacks.
- Coupons.
- Reserved seating.
- White label.
- Public API product.
- Native mobile apps.
- AI forecasting.
- Settlement engine.
- Tax automation.
- Invoices.
- Advanced BI.

## Final Recommendation

Proceed with RC1 demo using the verified public checkout and Staff PWA validation flow on the documented default PWA port.

Avoid live organizer event creation/publishing unless a prepared dashboard fixture is loaded before the demo.
