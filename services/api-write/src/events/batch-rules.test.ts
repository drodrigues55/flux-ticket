import test from 'node:test';
import assert from 'node:assert/strict';

// Helper validation functions representing the business rules implemented in TicketTypesService
function validateBatchConfig(input: any, ticketType: any, event: any, existingBatches: any[], batchId?: string) {
  if (!input.name) {
    throw new Error('Batch name is required.');
  }
  if (input.price !== undefined && input.price < 0) {
    throw new Error('Price must be zero or greater.');
  }
  if (input.totalQuantity !== undefined && input.totalQuantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }
  const start = input.salesStart ? new Date(input.salesStart) : null;
  const end = input.salesEnd ? new Date(input.salesEnd) : null;
  if (start && end && end <= start) {
    throw new Error('Sales end must be after sales start.');
  }
  if (start && start > new Date(event.date)) {
    throw new Error('Sales start should not be after event start.');
  }
  if (end && event.endDate && end > new Date(event.endDate)) {
    throw new Error('Sales end should not be after event end.');
  }

  if (ticketType.capacity !== undefined) {
    const otherBatches = existingBatches.filter(b => b.id !== batchId);
    const otherCapacity = otherBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
    const requestedCapacity = input.totalQuantity !== undefined ? input.totalQuantity : 0;
    if (otherCapacity + requestedCapacity > ticketType.capacity) {
      throw new Error(`Total batch capacity exceeds ticket type capacity (${ticketType.capacity}).`);
    }
  }
  return true;
}

function canUpdatePrice(price: number, oldPrice: number, sold: number, reserved: number): boolean {
  if (price !== oldPrice && (sold > 0 || reserved > 0)) {
    return false;
  }
  return true;
}

function canReduceCapacity(newCapacity: number, sold: number, reserved: number): boolean {
  const lockedQuantity = sold + reserved;
  return newCapacity >= lockedQuantity;
}

function validateReorder(inputIds: string[], existingIds: string[]): boolean {
  if (inputIds.length !== existingIds.length) {
    throw new Error('Incorrect number of batch IDs.');
  }
  const uniqueInputIds = Array.from(new Set(inputIds));
  if (uniqueInputIds.length !== inputIds.length) {
    throw new Error('Duplicate batch IDs.');
  }
  const hasForeign = inputIds.some(id => !existingIds.includes(id));
  if (hasForeign) {
    throw new Error('Foreign batch IDs.');
  }
  return true;
}

function canActivate(batch: any): boolean {
  if (batch.archivedAt) return false;
  if (batch.availableQuantity <= 0) return false;
  const now = new Date();
  if (batch.salesEnd && new Date(batch.salesEnd) < now) return false;
  return true;
}

// Test cases
test('rejects batch with negative price', () => {
  assert.throws(() => {
    validateBatchConfig({ name: 'Lote 1', price: -5, totalQuantity: 100 }, { capacity: 500 }, { date: '2026-10-10' }, []);
  }, /Price must be zero or greater/);
});

test('rejects batch with zero/negative quantity', () => {
  assert.throws(() => {
    validateBatchConfig({ name: 'Lote 1', price: 10, totalQuantity: 0 }, { capacity: 500 }, { date: '2026-10-10' }, []);
  }, /Quantity must be greater than zero/);
});

test('rejects sales end before sales start', () => {
  assert.throws(() => {
    validateBatchConfig(
      { name: 'Lote 1', price: 10, totalQuantity: 100, salesStart: '2026-10-05T10:00:00Z', salesEnd: '2026-10-04T10:00:00Z' },
      { capacity: 500 },
      { date: '2026-10-10T12:00:00Z' },
      []
    );
  }, /Sales end must be after sales start/);
});

test('rejects sales start after event start', () => {
  assert.throws(() => {
    validateBatchConfig(
      { name: 'Lote 1', price: 10, totalQuantity: 100, salesStart: '2026-10-12T10:00:00Z' },
      { capacity: 500 },
      { date: '2026-10-10T12:00:00Z' },
      []
    );
  }, /Sales start should not be after event start/);
});

test('rejects total batch capacity exceeding ticket type capacity', () => {
  assert.throws(() => {
    validateBatchConfig(
      { name: 'Lote 2', price: 10, totalQuantity: 300 },
      { capacity: 500 },
      { date: '2026-10-10T12:00:00Z' },
      [{ id: 'batch-1', totalQuantity: 300 }]
    );
  }, /Total batch capacity exceeds ticket type capacity/);
});

test('rejects price edits if sold tickets exist', () => {
  assert.equal(canUpdatePrice(150, 100, 1, 0), false);
  assert.equal(canUpdatePrice(150, 100, 0, 1), false);
  assert.equal(canUpdatePrice(150, 100, 0, 0), true);
});

test('rejects capacity reductions below locked quantity', () => {
  assert.equal(canReduceCapacity(80, 50, 40), false); // locked = 90
  assert.equal(canReduceCapacity(100, 50, 40), true);
});

test('rejects batch reordering with duplicated or foreign IDs', () => {
  assert.throws(() => {
    validateReorder(['id-1', 'id-1'], ['id-1', 'id-2']);
  }, /Duplicate batch IDs/);

  assert.throws(() => {
    validateReorder(['id-1', 'id-3'], ['id-1', 'id-2']);
  }, /Foreign batch IDs/);

  assert.equal(validateReorder(['id-2', 'id-1'], ['id-1', 'id-2']), true);
});

test('rejects activation of invalid batches', () => {
  assert.equal(canActivate({ archivedAt: new Date(), availableQuantity: 10 }), false);
  assert.equal(canActivate({ archivedAt: null, availableQuantity: 0 }), false);
  assert.equal(canActivate({ archivedAt: null, availableQuantity: 10, salesEnd: '2026-05-01' }), false);
});
