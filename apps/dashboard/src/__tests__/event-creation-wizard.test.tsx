import test from 'node:test';
import assert from 'node:assert/strict';
import { readEnvelope, slugify } from '../pages/events/new';

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
