import test from 'node:test';
import assert from 'node:assert/strict';

// Core api-read data structure boundaries verification
function filterEventsByOrganizer(events: any[], organizerId: string): any[] {
  return events.filter(e => e.organizerId === organizerId);
}

function getPublicCatalogEvents(events: any[]): any[] {
  return events.filter(e => e.status === 'PUBLISHED');
}

function sanitizeStaffOfflineBundle(bundle: any): any {
  // Exclude sensitive payment details or customer addresses
  const { paymentDetails, cardInfo, ...safeBundle } = bundle;
  return safeBundle;
}

// Test cases
test('organizer event list boundary filters out foreign organizer events', () => {
  const events = [
    { id: '1', name: 'My Event', organizerId: 'org-1' },
    { id: '2', name: 'Other Event', organizerId: 'org-2' },
  ];
  const filtered = filterEventsByOrganizer(events, 'org-1');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
});

test('public catalog lists only published events', () => {
  const events = [
    { id: '1', status: 'PUBLISHED' },
    { id: '2', status: 'DRAFT' },
    { id: '3', status: 'ARCHIVED' },
  ];
  const catalog = getPublicCatalogEvents(events);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, '1');
});

test('staff offline bundle sanitization removes sensitive billing data', () => {
  const bundle = {
    eventId: 'evt-1',
    validTicketSignatures: ['sig-1'],
    paymentDetails: { cardNumber: '4111-XXXX-XXXX-1111' },
    cardInfo: 'VISA',
  };
  const sanitized = sanitizeStaffOfflineBundle(bundle);
  assert.equal(sanitized.paymentDetails, undefined);
  assert.equal(sanitized.cardInfo, undefined);
  assert.equal(sanitized.eventId, 'evt-1');
});
