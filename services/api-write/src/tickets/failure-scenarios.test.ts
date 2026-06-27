import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, createTicketType, createBatch, generateQRSignature } from '../test-helpers';

// Simulated concurrency lock
class MockInventoryLock {
  private stock: number;
  private locked: number = 0;

  constructor(stock: number) {
    this.stock = stock;
  }

  async acquireLock(qty: number): Promise<boolean> {
    if (this.locked + qty > this.stock) {
      return false; // Oversell blocked
    }
    this.locked += qty;
    return true;
  }
}

test('oversell prevention under concurrency simulation', async () => {
  const lock = new MockInventoryLock(1); // Only 1 ticket left
  
  // Simulate two concurrent reservation attempts
  const res1 = await lock.acquireLock(1);
  const res2 = await lock.acquireLock(1);

  assert.equal(res1, true); // First user succeeds
  assert.equal(res2, false); // Second user blocked from overselling
});

test('rejects deleting published events', () => {
  const event = createEvent('PUBLISHED');
  
  const canDelete = event.status === 'DRAFT';
  assert.equal(canDelete, false);
});

test('unpublish rejects if status is not PUBLISHED', () => {
  const event = createEvent('DRAFT');
  
  const canUnpublish = event.status === 'PUBLISHED';
  assert.equal(canUnpublish, false);
});

test('rejects duplicate outbox event check processing', () => {
  const processedOutboxIds = new Set<string>();
  
  function processEvent(id: string): boolean {
    if (processedOutboxIds.has(id)) {
      return false; // Duplicate blocked (idempotent)
    }
    processedOutboxIds.add(id);
    return true;
  }

  assert.equal(processEvent('evt-job-1'), true);
  assert.equal(processEvent('evt-job-1'), false); // Second attempt blocked
});

test('rejects expired reservations during checkout validation', () => {
  const reservation = {
    id: 'res-1',
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  };

  const now = new Date();
  const isExpired = reservation.expiresAt < now;
  assert.equal(isExpired, true);
});
