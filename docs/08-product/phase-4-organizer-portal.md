# Phase 4 - Organizer Portal

Phase 4 adds organizer event management after the Phase 3 creation flow.

Organizers can list events, search/filter/sort/paginate them, open an event shell, edit general information, archive events, duplicate events into new drafts, and delete only safe draft events.

## Dashboard Routes

- `/events`
- `/events/:eventId`
- `/events/:eventId/overview`
- `/events/:eventId/general`
- `/events/:eventId/tickets`
- `/events/:eventId/publishing`
- `/events/:eventId/advanced`

The Tickets and Publishing tabs are placeholders for Phase 5 and Phase 7. They do not implement Ticket Workspace or full publishing workflow.

## Read Endpoints

`api-read` exposes organizer read models:

- `GET /organizer/events`
- `GET /organizer/events/:eventId`
- `GET /organizer/events/:eventId/overview`
- `GET /organizer/events/:eventId/general`
- Existing Phase 3 endpoints remain available:
  - `GET /organizer/events/:eventId/edit`
  - `GET /organizer/events/:eventId/review`

The list endpoint supports:

- `search`
- `status`
- `sort=updatedAt|startAt|name`
- `direction=asc|desc`
- `page`
- `limit`
- optional `startFrom` and `startTo`

## Write Endpoints

`api-write` exposes organizer mutations:

- `PATCH /organizer/events/:eventId/general`
- `POST /organizer/events/:eventId/archive`
- `POST /organizer/events/:eventId/duplicate`
- `DELETE /organizer/events/:eventId`

Existing Phase 3 mutation endpoints remain unchanged.

## Shared Contracts

`packages/types` adds:

- `OrganizerEventListItem`
- `OrganizerEventListQuery`
- `OrganizerEventListResponse`
- `OrganizerEventDetail`
- `OrganizerEventOverview`
- `OrganizerEventGeneral`
- `UpdateEventGeneralInput`
- `ArchiveEventInput`
- `DuplicateEventInput`

## Lifecycle Rules

- `DRAFT` list action: Continue setup.
- `READY_FOR_VALIDATION` list action: Review publishing.
- `PUBLISHED` list action: Manage event.
- `ARCHIVED` list action: View archive.
- Archive is a soft state change to `ARCHIVED`.
- Duplicate creates a new `DRAFT` event and copies event setup plus ticket types/default batches only.
- Duplicate does not copy orders, reservations, payments, issued tickets, check-ins, alerts, or other operational records.
- Delete is allowed only for safe `DRAFT` events without transactional or operational records.
- Published events cannot be hard-deleted.

## Known Limitations

Phase 4 intentionally does not implement:

- Phase 5 Ticket Workspace
- Phase 6 Batch Management
- Phase 7 full Publishing Workflow
- Checkout changes
- Seating
- Coupons
- Dashboard 2.0 or analytics expansion
