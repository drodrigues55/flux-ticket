import test from 'node:test';
import assert from 'node:assert/strict';
import type { EventCreationDraft } from '@flux/types';
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
