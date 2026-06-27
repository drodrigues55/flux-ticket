import test from 'node:test';
import assert from 'node:assert/strict';
import { readEnvelope, slugify } from '../pages/events/new';
import { buildEventListQuery } from '../pages/events';
import { generalPayload, readPortalEnvelope } from '../features/organizer/EventPortal';

test('normalizes event names into URL-safe slugs', () => {
  assert.equal(slugify('Festival São João 2026!'), 'festival-sao-joao-2026');
});

test('reads successful Phase 1 envelopes', async () => {
  const response = new Response(JSON.stringify({ data: { id: 'event-1' }, meta: { requestId: 'req_1' } }), { status: 200 });
  const envelope = await readEnvelope<{ id: string }>(response);
  assert.equal(envelope.data.id, 'event-1');
  assert.equal(envelope.meta.requestId, 'req_1');
});

test('preserves requestId from error envelopes', async () => {
  const response = new Response(JSON.stringify({
    error: {
      code: 'EVENT_SLUG_DUPLICATE',
      message: 'Slug is already used by another event for this organizer.',
      statusCode: 400,
      requestId: 'req_duplicate',
    },
  }), { status: 400 });

  await assert.rejects(
    () => readEnvelope(response),
    (error: any) => error.message === 'Slug is already used by another event for this organizer.' && error.requestId === 'req_duplicate'
  );
});

test('builds event list query with search filter sort and pagination', () => {
  const query = buildEventListQuery({
    search: 'Launch',
    status: 'DRAFT',
    sort: 'startAt',
    direction: 'asc',
    page: 2,
    limit: 10,
  });

  assert.equal(query, 'search=Launch&status=DRAFT&sort=startAt&direction=asc&page=2&limit=10');
});

test('general payload maps form dates and optional values', () => {
  const payload = generalPayload({
    name: 'Launch',
    slug: 'launch',
    shortDescription: '',
    description: 'Details',
    categoryId: '',
    startAt: '2026-08-01T20:00',
    endAt: '',
    timezone: 'America/Cuiaba',
    locationType: 'PHYSICAL',
    venueName: 'Arena',
    addressLine1: '',
    city: '',
    state: '',
    onlineUrl: '',
    bannerImageUrl: '',
    capacityTarget: '',
  });

  assert.equal(payload.name, 'Launch');
  assert.equal(payload.description, 'Details');
  assert.equal(payload.shortDescription, undefined);
  assert.equal(payload.categoryId, undefined);
  assert.equal(typeof payload.startAt, 'string');
});

test('portal envelope preserves requestId from server errors', async () => {
  const response = new Response(JSON.stringify({
    error: {
      message: 'Cannot delete published event.',
      requestId: 'req_delete',
      statusCode: 400,
      code: 'EVENT_DELETE_INVALID_STATUS',
    },
  }), { status: 400 });

  await assert.rejects(
    () => readPortalEnvelope(response),
    (error: any) => error.message === 'Cannot delete published event.' && error.requestId === 'req_delete'
  );
});
