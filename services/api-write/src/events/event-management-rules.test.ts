import test from 'node:test';
import assert from 'node:assert/strict';
import { canArchiveEvent, canDeleteEvent } from './event-management-rules';

const emptyCounts = { tickets: 0, payments: 0, reservations: 0, orders: 0, checkins: 0, alerts: 0 };

test('allows deleting safe draft events', () => {
  assert.equal(canDeleteEvent({ status: 'DRAFT', counts: emptyCounts }), true);
});

test('rejects deleting published events', () => {
  assert.equal(canDeleteEvent({ status: 'PUBLISHED', counts: emptyCounts }), false);
});

test('rejects deleting draft events with transactional records', () => {
  assert.equal(canDeleteEvent({ status: 'DRAFT', counts: { ...emptyCounts, payments: 1 } }), false);
});

test('allows archiving active states and rejects closed archive states', () => {
  assert.equal(canArchiveEvent('DRAFT'), true);
  assert.equal(canArchiveEvent('READY_FOR_VALIDATION'), true);
  assert.equal(canArchiveEvent('ARCHIVED'), false);
  assert.equal(canArchiveEvent('CANCELLED'), false);
});
