import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPaymentError } from './payment-errors';

test('payment error formatter displays server request id', () => {
  assert.equal(
    formatPaymentError({ error: { message: 'Provider failed', requestId: 'req-123' } }),
    'Provider failed (requestId: req-123)'
  );
});

test('payment error formatter falls back to message without request id', () => {
  assert.equal(formatPaymentError({ message: 'Rejected' }), 'Rejected');
});
