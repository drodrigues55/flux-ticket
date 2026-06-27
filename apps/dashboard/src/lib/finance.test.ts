import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaymentLedgerQuery, financeExportUrl } from './finance';

test('buildPaymentLedgerQuery includes filters sorting and pagination', () => {
  const query = buildPaymentLedgerQuery({
    status: 'APPROVED',
    eventId: 'event-1',
    provider: 'MOCK',
    page: 2,
    limit: 20,
    sort: 'amount',
    direction: 'asc',
  });
  assert.equal(query, 'status=APPROVED&eventId=event-1&provider=MOCK&page=2&limit=20&sort=amount&direction=asc');
});

test('financeExportUrl targets organizer finance proxy', () => {
  assert.equal(financeExportUrl('/exports/payments.csv'), '/api/organizer/finance/exports/payments.csv');
});
