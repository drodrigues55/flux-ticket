# Manual QA Results - RC1

Manual browser walkthrough executed for Release Candidate 1 on 2026-06-28.

## Environment

| Surface | URL | Result |
| --- | --- | --- |
| Dashboard | `http://localhost:3001` | Loaded |
| Client | `http://localhost:3014` | Loaded after clean restart |
| Staff PWA | `http://localhost:3000` | Loaded after clearing stale `.next` artifacts and restarting dev server |
| API Read | `http://localhost:3002/health/live` | Healthy |
| API Write | `http://localhost:4000/health/live` | Healthy |

The default client dev port was already occupied during the original walkthrough. The Staff PWA default port was later revalidated on `http://localhost:3000` after clearing generated `.next` artifacts that had been corrupted by running production builds while dev servers were active.

## Walkthrough Results

| Step | Scenario | Result | Classification | Notes |
| --- | --- | --- | --- | --- |
| 1 | Start local/staging environment | PASS | - | Existing local services were already active; alternate clean client/PWA ports were started for browser validation. |
| 2 | Confirm dashboard loads without runtime/console errors | PASS | Post-RC1 Polish | Dashboard loaded. Next `legacyBehavior` warnings remain non-blocking. |
| 3 | Login/open as owner/admin | PASS | - | Dashboard opened with mock owner/admin context visible as organizer. |
| 4 | Open organization/team roles | PASS | - | `/organization/members` loaded. |
| 5 | Confirm permission labels make sense | PASS | - | OWNER, ADMIN, FINANCE, event manager, staff, and read-only analyst labels are understandable. |
| 6 | Create or open demo event | PARTIAL | Demo Risk | Public seed events exist, but dashboard organizer event list is empty. Creating a new dashboard event returned `Invalid event input` with no visible field-level detail. |
| 7 | Review event basic info | PARTIAL | Demo Risk | Public event details loaded for Bee Gees Alive. Dashboard event basic info could not be reviewed for the same seed event because organizer workspace returned `Event not found`. |
| 8 | Open ticket workspace | PARTIAL | Demo Risk | Public event ticket selection works. Dashboard ticket workspace for public seed event returned `Event not found`. |
| 9 | Review ticket type and batch configuration | PASS | - | Public event showed sectors and active batches with prices and availability. |
| 10 | Open publishing checklist | PARTIAL | Demo Risk | Dashboard publishing checklist route loaded shell, but public seed event returned `Failed to load publishing checklist`. |
| 11 | Publish or verify published state | PASS | - | Public API and catalog expose the seed event as purchasable/published. Dashboard publish workflow remains a risk for live organizer demo. |
| 12 | Open public event page | PASS | - | `/event/{id}` loaded after fixing catalog fallback and cleaning client cache. |
| 13 | Select ticket | PASS | Post-RC1 Polish | Ticket selection works. Some icon-only quantity buttons have weak accessible names. |
| 14 | Reserve ticket | PASS | - | Checkout opened with active reservation timer. |
| 15 | Complete checkout with mock payment | PASS | - | Mock card payment completed successfully. |
| 16 | Confirm ticket access | PASS | Demo Risk | Success page generated ticket `cfcfc35e-0c4a-4fa0-a050-4270c69e00e9`; direct ticket page showed VALID ticket. Wallet button routes to email OTP gate, so demo should use direct ticket link or complete OTP flow. |
| 17 | Open staff PWA | PASS | - | Clean PWA loaded on default port `http://localhost:3000`; event list loaded through `/api/events`. |
| 18 | Validate ticket QR or simulated QR | PASS | - | Sync gate cleared, simulated valid QR returned visible `Acesso Liberado!`, queued one offline check-in, and `/staff-mutation` returned 200 through the PWA proxy. |
| 19 | Confirm already-used/wrong-event state if practical | PASS | - | Simulated adulterated QR returned visible `Acesso Recusado! Assinatura inválida`; `/scan-fail` returned 200. |
| 20 | Open financial center | PASS | Demo Risk | Financial center loads and clearly labels mock provider / estimated values. Values stayed zero after the client checkout, so do not rely on live financial deltas in demo. |
| 21 | Confirm revenue/payment status is understandable | PASS | Demo Risk | Labels are understandable: gross revenue, estimated fees, net revenue, approved/pending/failed, mock provider. |
| 22 | Open dashboard command center | PASS | Demo Risk | Dashboard command center loads and shows empty-state copy instead of crashing. |
| 23 | Confirm event priority/alerts make sense | PASS | Demo Risk | Empty state says no operational alerts and includes request IDs. No priority event was available in this dataset. |
| 24 | Confirm known limitations are documented and not hidden | PASS | - | Finance page explicitly states mock provider, no real gateway, and no payouts. Final summary lists exclusions. |

## Issues

| Classification | Issue | Status |
| --- | --- | --- |
| Demo Blocker | Client catalog events had `slug: null`, so catalog card CTA could fall back to `/events` instead of opening the event detail page. | Fixed by routing fallback to `/event/{id}`. |
| Demo Blocker | Staff PWA called `/api/events`, but the PWA had no index route for event listing, blocking event selection. | Fixed by adding the minimal PWA `/api/events` read proxy. |
| Demo Risk | Dashboard organizer workspace does not show public seed events; opening a public seed event in dashboard routes returns `Event not found`. | Mitigated in RC1 risk cleanup by aligning `seed-categories.ts` with dashboard organizer ID `organizer-mock`. Rerun seed before demo. |
| Demo Risk | Dashboard event creation returned `Invalid event input` without visible field-level detail during manual attempt. | Mitigated by documenting prepared seed as default path. Live creation should be shown only after target-environment validation; capture request ID if it fails. |
| Demo Risk | Finance center remained zero after client mock checkout in this local dataset. | Documented. Present as read-model screen with mock-provider limitation unless seeded finance data is prepared. |
| Demo Risk | Default dev ports had stale/corrupted `.next` artifacts after builds were run while dev servers were active. | Mitigated by clearing generated artifacts and using clean alternate ports. |
| Demo Risk | Staff PWA sync gate attempted to call staff mutation before loading offline signatures, even when there were no pending check-ins. | Fixed for empty queues; sync gate can now clear and load offline signatures without requiring `api-write` until a real pending check-in exists. |
| Demo Risk | Staff PWA simulator success/error states were present but hard to target and verify in browser automation. | Fixed by keeping the simulator open during demo and exposing stable visible result/test IDs. |
| Post-RC1 Polish | Dashboard emits Next `legacyBehavior` warnings. | Not fixed. |
| Post-RC1 Polish | Staff PWA and legacy event page still use some dark-theme styling and icon-only buttons with weak accessible names. | Not fixed. |

## RC1 Risk Cleanup Update - Dashboard Seed

The dashboard seed consistency issue was traced to different organizer fixtures: public seed events were created under `organizer@flux.com`, while dashboard proxy routes authenticate as `mock-organizer@flux.com` with ID `organizer-mock`.

`packages/database/seed-categories.ts` now creates the seed organizer as `organizer-mock`, adds slugs/images/location summary fields to seeded events, and moves the Bee Gees fixture to `2026-08-14T20:00:00Z`. After running `npx prisma db seed`, public catalog, dashboard organizer event list/workspace, Staff PWA event selection, and dashboard command center should share the same prepared event dataset.

## Final Result

**Demo Ready with Known Risks**
