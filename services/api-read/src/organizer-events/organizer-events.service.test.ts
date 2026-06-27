import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizerEventListQuerySchema, type EventCreationDraft } from '@flux/types';
import { reviewMessages } from './organizer-events.service';

function draft(overrides: Partial<EventCreationDraft> = {}): EventCreationDraft {
  const base: EventCreationDraft = {
    event: {
      id: 'event-1',
      name: 'Launch Night',
      slug: 'launch-night',
      shortDescription: null,
      description: null,
      categoryId: null,
      startAt: '2026-08-01T20:00:00.000Z',
      endAt: '2026-08-01T23:00:00.000Z',
      timezone: 'America/Cuiaba',
      locationType: 'PHYSICAL',
      venueName: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: 'BR',
      onlineUrl: null,
      bannerImageUrl: null,
      capacityTarget: null,
      status: 'DRAFT',
    },
    ticketType: {
      id: 'ticket-type-1',
      name: 'General Admission',
      description: null,
      quantity: 100,
      basePrice: 50,
      salesStart: null,
      salesEnd: null,
      batchId: 'batch-1',
    },
    currentStep: 'REVIEW',
  };
  return { ...base, ...overrides };
}

test('returns recommended warnings without blocking optional polish fields', () => {
  const result = reviewMessages(draft());
  assert.deepEqual(result.blockers, []);
  assert.ok(result.warnings.includes('Category is recommended before publishing.'));
  assert.ok(result.warnings.includes('Banner image is recommended before publishing.'));
  assert.ok(result.warnings.includes('Full description is recommended before publishing.'));
});

test('returns blockers for missing minimal ticket configuration', () => {
  const result = reviewMessages(draft({ ticketType: null }));
  assert.ok(result.blockers.includes('At least one minimal ticket type is required.'));
});

test('returns blockers for invalid ticket quantity and price', () => {
  const result = reviewMessages(draft({
    ticketType: {
      id: 'ticket-type-1',
      name: 'General Admission',
      description: null,
      quantity: 0,
      basePrice: -1,
      salesStart: null,
      salesEnd: null,
      batchId: null,
    },
  }));
  assert.ok(result.blockers.includes('At least one default ticket configuration is required.'));
  assert.ok(result.blockers.includes('Ticket quantity must be greater than zero.'));
  assert.ok(result.blockers.includes('Ticket price must be zero or greater.'));
});

test('parses organizer event list search filter sort and pagination query', () => {
  const query = OrganizerEventListQuerySchema.parse({
    search: 'Launch',
    status: 'DRAFT',
    sort: 'startAt',
    direction: 'asc',
    page: '2',
    limit: '5',
  });

  assert.equal(query.search, 'Launch');
  assert.equal(query.status, 'DRAFT');
  assert.equal(query.sort, 'startAt');
  assert.equal(query.direction, 'asc');
  assert.equal(query.page, 2);
  assert.equal(query.limit, 5);
});

test('defaults organizer event list query to updated desc first page', () => {
  const query = OrganizerEventListQuerySchema.parse({});
  assert.equal(query.sort, 'updatedAt');
  assert.equal(query.direction, 'desc');
  assert.equal(query.page, 1);
  assert.equal(query.limit, 10);
});

// Test derived status logic
const deriveStatus = (batch: any): string => {
  if (batch.archivedAt) return 'ARCHIVED';
  const now = new Date();
  if (batch.salesEnd && batch.salesEnd < now) return 'COMPLETED';
  if (batch.status === 'COMPLETED') return 'COMPLETED';
  if (batch.status === 'PAUSED' || !batch.isActive) return 'PAUSED';
  if (batch.salesStart && batch.salesStart > now) return 'PENDING';
  if (batch.status === 'ACTIVE' || batch.isActive) return 'ACTIVE';
  return batch.status;
};

test('derives ARCHIVED status when archivedAt is set', () => {
  const batch = { archivedAt: new Date(), isActive: true, status: 'ACTIVE' };
  assert.equal(deriveStatus(batch), 'ARCHIVED');
});

test('derives COMPLETED status when salesEnd is in the past', () => {
  const batch = { archivedAt: null, salesEnd: new Date(Date.now() - 100000), isActive: true, status: 'ACTIVE' };
  assert.equal(deriveStatus(batch), 'COMPLETED');
});

test('derives PENDING status when salesStart is in the future', () => {
  const batch = { archivedAt: null, salesStart: new Date(Date.now() + 100000), isActive: true, status: 'ACTIVE' };
  assert.equal(deriveStatus(batch), 'PENDING');
});

test('derives PAUSED status when isActive is false', () => {
  const batch = { archivedAt: null, isActive: false, status: 'ACTIVE' };
  assert.equal(deriveStatus(batch), 'PAUSED');
});

test('derives ACTIVE status when active and within sales window', () => {
  const batch = { archivedAt: null, isActive: true, status: 'ACTIVE', salesStart: null, salesEnd: null };
  assert.equal(deriveStatus(batch), 'ACTIVE');
});

