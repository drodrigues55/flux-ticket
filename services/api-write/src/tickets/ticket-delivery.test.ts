import test from 'node:test';
import assert from 'node:assert/strict';

// Core ticket delivery business rules validation logic
function checkDeliveryAllowed(orderStatus: string): boolean {
  return orderStatus === 'PAID';
}

function processResend(order: any): { success: boolean; error?: string } {
  if (order.status !== 'PAID') {
    return { success: false, error: 'Tickets can only be resent for paid orders.' };
  }
  return { success: true };
}

// Test cases
test('allows ticket delivery only for approved/paid orders', () => {
  assert.equal(checkDeliveryAllowed('PAID'), true);
  assert.equal(checkDeliveryAllowed('PENDING'), false);
  assert.equal(checkDeliveryAllowed('FAILED'), false);
  assert.equal(checkDeliveryAllowed('EXPIRED'), false);
});

test('accepts resend request for paid orders', () => {
  const order = { id: 'o-1', status: 'PAID' };
  const res = processResend(order);
  assert.equal(res.success, true);
});

test('rejects resend request for unpaid/pending orders', () => {
  const order = { id: 'o-2', status: 'PENDING' };
  const res = processResend(order);
  assert.equal(res.success, false);
  assert.equal(res.error, 'Tickets can only be resent for paid orders.');
});
