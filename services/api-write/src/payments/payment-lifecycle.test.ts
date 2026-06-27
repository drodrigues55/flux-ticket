import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMockScenarioAllowed, getPaymentTransition, getPaymentWebhookDedupeKey } from './payment-lifecycle';
import { MockPaymentProvider } from './mock-payment.provider';
import { TemporaryProviderFailure } from './payment-provider';

test('payment lifecycle only allows approved payment to issue tickets', () => {
  assert.equal(getPaymentTransition('PENDING', 'APPROVED').action, 'APPROVE');
  assert.equal(getPaymentTransition('PENDING', 'REJECTED').action, 'RELEASE');
  assert.equal(getPaymentTransition('APPROVED', 'REJECTED').allowed, false);
});

test('webhook dedupe prefers provider event id', () => {
  assert.equal(getPaymentWebhookDedupeKey({ providerEventId: 'evt-1', providerPaymentId: 'pay-1' }), 'evt-1');
  assert.equal(getPaymentWebhookDedupeKey({ providerEventId: null, providerPaymentId: 'pay-1' }), 'pay-1');
});

test('mock provider supports explicit approved pending rejected and expired scenarios', async () => {
  const provider = new MockPaymentProvider();
  const order = { id: 'order-1', eventId: 'event-1', buyerId: 'buyer-1', amount: 10 };

  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'approved' })).status, 'APPROVED');
  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'pending' })).status, 'PENDING');
  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'rejected' })).status, 'REJECTED');
  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'expired' })).status, 'EXPIRED');
  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'cancelled' })).status, 'CANCELLED');
  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'refunded' })).status, 'REFUNDED');
  assert.equal((await provider.createPayment(order, { method: 'credit_card', scenario: 'failed' })).status, 'FAILED');
  await assert.rejects(
    () => provider.createPayment(order, { method: 'credit_card', scenario: 'temporary_failure' }),
    TemporaryProviderFailure
  );
});

test('mock scenario controls are rejected in production', () => {
  assert.throws(
    () => assertMockScenarioAllowed({ scenario: 'approved', nodeEnv: 'production' }),
    /not allowed in production/
  );
  assert.doesNotThrow(() => assertMockScenarioAllowed({ scenario: 'approved', nodeEnv: 'test' }));
});
