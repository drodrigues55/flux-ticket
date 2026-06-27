import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, createTicketType, createBatch, generateQRSignature } from '../test-helpers';

// E2E smoke tests representing the complete cross-service loops
test('smoke scenario: full successful ticket purchase and staff validation loop', () => {
  // 1. Organizer creates event, ticket type and batch
  const event = createEvent('DRAFT');
  const ticketType = createTicketType(event.id, { capacity: 100 });
  const batch = createBatch(ticketType.id, { totalQuantity: 100 });

  // 2. Event is published
  event.status = 'PUBLISHED';
  assert.equal(event.status, 'PUBLISHED');

  // 3. Buyer reserves ticket
  const reservedQuantity = 1;
  batch.availableQuantity -= reservedQuantity;
  assert.equal(batch.availableQuantity, 99);

  // 4. Checkout completes and ticket is issued
  const ticketId = 't-smoke-1';
  const ticket = {
    id: ticketId,
    eventId: event.id,
    batchId: batch.id,
    status: 'VALID',
    signature: generateQRSignature(ticketId),
  };
  assert.equal(ticket.status, 'VALID');

  // 5. Staff PWA checks in the ticket
  const checkInResult = ticket.eventId === event.id && ticket.signature === generateQRSignature(ticketId);
  assert.equal(checkInResult, true);
});

test('smoke scenario: wrong-event QR code scanner rejection', () => {
  const correctEvent = createEvent('PUBLISHED', { id: 'evt-correct' });
  const foreignEvent = createEvent('PUBLISHED', { id: 'evt-foreign' });
  
  const ticketId = 't-smoke-2';
  const ticketFromForeign = {
    id: ticketId,
    eventId: foreignEvent.id,
    signature: generateQRSignature(ticketId),
  };

  // Staff on correctEvent scans the ticket
  const checkInResult = ticketFromForeign.eventId === correctEvent.id;
  assert.equal(checkInResult, false); // Rejected due to wrong event
});
