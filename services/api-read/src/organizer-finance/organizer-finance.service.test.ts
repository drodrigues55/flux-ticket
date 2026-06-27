import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateFees, isApprovedPayment, isFailedExpiredPayment, isPendingPayment } from './finance-calculations';
import { rowsToCsv } from './organizer-finance.service';

test('financial fee estimate calculates gross fee and net values', () => {
  const result = estimateFees(100, { percentage: 5, fixedFee: 2 });
  assert.equal(result.feeAmount, 7);
  assert.equal(result.netAmount, 93);
  assert.equal(result.label, 'Estimated');
});

test('financial status helpers classify approved pending and failed expired totals', () => {
  assert.equal(isApprovedPayment('APPROVED'), true);
  assert.equal(isPendingPayment('PENDING'), true);
  assert.equal(isFailedExpiredPayment('EXPIRED'), true);
  assert.equal(isFailedExpiredPayment('FAILED'), true);
  assert.equal(isFailedExpiredPayment('APPROVED'), false);
});

test('CSV export escapes values and excludes raw sensitive fields by construction', () => {
  const csv = rowsToCsv([
    ['payment id', 'amount'],
    ['pay-"1"', '10'],
  ]);
  assert.equal(csv.includes('"pay-""1"""'), true);
  assert.equal(csv.includes('rawPayload'), false);
});
