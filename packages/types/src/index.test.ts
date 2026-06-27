import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateEventInputSchema, MinimalTicketTypeInputSchema, TicketBatchSchema } from './validation/event';
import { MockPaymentProviderCapability, MockPaymentScenarios } from './payment';
import { FinancialExportQuerySchema, FinancialPaymentLedgerQuerySchema } from './financial';

test('CreateEventInputSchema rejects missing name and startAt', () => {
  const result = CreateEventInputSchema.safeParse({
    slug: 'my-event',
    timezone: 'UTC',
    locationType: 'PHYSICAL',
  });
  assert.equal(result.success, false);
});

test('MinimalTicketTypeInputSchema rejects negative price', () => {
  const result = MinimalTicketTypeInputSchema.safeParse({
    name: 'General',
    quantity: 100,
    basePrice: -50.0,
  });
  assert.equal(result.success, false);
});

test('TicketBatchSchema rejects invalid price or quantity', () => {
  const result = TicketBatchSchema.safeParse({
    name: 'Early Bird',
    price: -10,
    quantity: 0,
  });
  assert.equal(result.success, false);
});

test('mock payment provider capability is explicit about real gateway availability', () => {
  assert.equal(MockPaymentProviderCapability.provider, 'MOCK');
  assert.equal(MockPaymentProviderCapability.realGatewayAvailable, false);
  assert.deepEqual(MockPaymentProviderCapability.supportedMethods, ['pix', 'credit_card']);
});

test('mock payment scenarios include terminal and retryable outcomes', () => {
  assert.equal(MockPaymentScenarios.includes('approved'), true);
  assert.equal(MockPaymentScenarios.includes('temporary_failure'), true);
  assert.equal(MockPaymentScenarios.includes('failed'), true);
});

test('FinancialPaymentLedgerQuerySchema rejects invalid date range and status', () => {
  assert.equal(FinancialPaymentLedgerQuerySchema.safeParse({ dateFrom: '2026-07-02T00:00:00.000Z', dateTo: '2026-07-01T00:00:00.000Z' }).success, false);
  assert.equal(FinancialPaymentLedgerQuerySchema.safeParse({ status: 'PAID' }).success, false);
});

test('FinancialExportQuerySchema rejects invalid export scope filters', () => {
  assert.equal(FinancialExportQuerySchema.safeParse({ limit: 0 }).success, false);
  assert.equal(FinancialExportQuerySchema.safeParse({ dateFrom: '2026-07-02T00:00:00.000Z', dateTo: '2026-07-01T00:00:00.000Z' }).success, false);
});
