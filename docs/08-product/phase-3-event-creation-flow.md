# Phase 3 - Event Creation Flow

Phase 3 adds the first narrow organizer event creation workflow.

The organizer can open `/events/new`, save a draft event, add one minimal ticket type with one default ticket configuration, review the draft, and mark it as `READY_FOR_VALIDATION`.

## Dashboard Route

- `apps/dashboard`: `GET /events/new`

The page is a four-step wizard:

1. Basic Information
2. Tickets
3. Review
4. Publish Entry Point

The first save creates the draft and stores `eventId` in the URL query. Later saves patch the same event.

## Write Endpoints

`services/api-write` exposes organizer-scoped mutation endpoints:

- `POST /organizer/events`
- `PATCH /organizer/events/:eventId`
- `POST /organizer/events/:eventId/ticket-types`
- `PATCH /organizer/events/:eventId/ticket-types/:ticketTypeId`
- `POST /organizer/events/:eventId/mark-ready`

All new endpoints return the Phase 1 response envelope with `meta.requestId` on success and `error.requestId` on failure.

## Read Endpoints

`services/api-read` exposes organizer-scoped read models:

- `GET /organizer/events/:eventId/edit`
- `GET /organizer/events/:eventId/review`

The Review step uses the review endpoint directly instead of composing state from multiple frontend calls.

## Shared Schemas

`packages/types` defines:

- `CreateEventInput`
- `UpdateEventBasicInfoInput`
- `MinimalTicketTypeInput`
- `EventCreationDraft`
- `EventCreationStep`
- `EventCreationReview`

API contracts use `startAt` and `endAt`. The write service maps them to existing Prisma fields `Event.date` and `Event.endDate`.

## Database

Migration:

- `20260627000100_phase3_event_creation_flow`

Additions:

- `EventStatus.READY_FOR_VALIDATION`
- `EventLocationType`
- event metadata fields for short description, timezone, location type, address parts, and online URL

## Validation

`mark-ready` requires:

- event name
- unique slug within organizer scope
- start date/time
- valid location type
- one minimal ticket type
- one default sellable ticket configuration
- ticket quantity greater than zero
- ticket price zero or greater

Missing banner image, category, full description, short description, and other polish fields are review warnings, not blockers.

## Known Limitations

This phase intentionally does not implement:

- full Ticket Workspace
- advanced batch management
- publishing validation workflow
- checkout or publishing integration
- coupons
- seating
- analytics or Dashboard 2.0 expansion
