import test from 'node:test';
import assert from 'node:assert/strict';

// Client buyer state verification logic
function checkTicketSellability(batch: any): { sellable: boolean; status: string } {
  if (!batch.isActive) return { sellable: false, status: 'INACTIVE' };
  if (batch.availableQuantity <= 0) return { sellable: false, status: 'SOLD_OUT' };
  
  const now = Date.now();
  if (batch.salesStart && now < new Date(batch.salesStart).getTime()) {
    return { sellable: false, status: 'SALES_NOT_STARTED' };
  }
  if (batch.salesEnd && now > new Date(batch.salesEnd).getTime()) {
    return { sellable: false, status: 'SALES_ENDED' };
  }
  
  return { sellable: true, status: 'SELLABLE' };
}

function checkPurchaseLimit(qty: number, limit: number): boolean {
  return qty <= limit;
}

// Test cases
test('blocks selecting sold out tickets', () => {
  const batch = { isActive: true, availableQuantity: 0 };
  const res = checkTicketSellability(batch);
  assert.equal(res.sellable, false);
  assert.equal(res.status, 'SOLD_OUT');
});

test('blocks selection before sales start date', () => {
  const batch = {
    isActive: true,
    availableQuantity: 10,
    salesStart: new Date(Date.now() + 60000).toISOString(), // Starts in 1 minute
  };
  const res = checkTicketSellability(batch);
  assert.equal(res.sellable, false);
  assert.equal(res.status, 'SALES_NOT_STARTED');
});

test('blocks selection after sales end date', () => {
  const batch = {
    isActive: true,
    availableQuantity: 10,
    salesEnd: new Date(Date.now() - 60000).toISOString(), // Ended 1 minute ago
  };
  const res = checkTicketSellability(batch);
  assert.equal(res.sellable, false);
  assert.equal(res.status, 'SALES_ENDED');
});

test('blocks selecting more than the purchase limit', () => {
  assert.equal(checkPurchaseLimit(6, 5), false);
  assert.equal(checkPurchaseLimit(3, 5), true);
});

function isPrintableTicket(status: string): boolean {
  return ['VALID', 'PENDING_VALIDATION', 'CONSUMED'].includes(status);
}

test('isPrintableTicket allows printable statuses and blocks revoked/pending payment', () => {
  assert.equal(isPrintableTicket('VALID'), true);
  assert.equal(isPrintableTicket('PENDING_VALIDATION'), true);
  assert.equal(isPrintableTicket('CONSUMED'), true);
  assert.equal(isPrintableTicket('REVOKED'), false);
  assert.equal(isPrintableTicket('PENDING_PAYMENT'), false);
});
