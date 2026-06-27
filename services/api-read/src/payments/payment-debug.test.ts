import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaymentDebugReadModel } from './payment-debug';

test('payment debug read model redacts raw payload values and keeps request ids', () => {
  const now = new Date('2026-06-27T12:00:00.000Z');
  const model = buildPaymentDebugReadModel(
    {
      id: 'payment-1',
      eventId: 'event-1',
      orderId: 'order-1',
      buyerId: 'buyer-1',
      method: 'PIX',
      status: 'PENDING',
      amount: { toString: () => '10', valueOf: () => 10 },
      installments: 1,
      provider: 'MOCK',
      providerPaymentId: 'provider-payment-1',
      providerStatus: 'pending',
      providerEventId: 'event-provider-1',
      idempotencyKey: 'idem-1',
      rawPayload: { token: 'secret', status: 'pending' },
      rawResponse: { qrCode: 'secret', providerPaymentId: 'provider-payment-1' },
      paidAt: null,
      refundedAt: null,
      createdAt: now,
      updatedAt: now,
      order: { id: 'order-1', status: 'PROCESSING', reservationId: 'reservation-1' },
      tickets: [{ id: 'ticket-1', status: 'PENDING_PAYMENT', batchId: 'batch-1', orderId: 'order-1', reservationId: 'reservation-1' }],
    },
    [
      {
        id: 'outbox-1',
        aggregateType: 'PAYMENT_WEBHOOK_RECEIVED',
        aggregateId: 'event-provider-1',
        type: 'payments.webhook',
        status: 'PENDING',
        attempts: 0,
        requestId: 'req-1',
        createdAt: now,
        processedAt: null,
      },
    ]
  );

  assert.deepEqual(model.payloadSummary.rawPayloadKeys, ['status', 'token']);
  assert.deepEqual(model.payloadSummary.rawResponseKeys, ['providerPaymentId', 'qrCode']);
  assert.equal((model as any).rawPayload, undefined);
  assert.deepEqual(model.requestIds, ['req-1']);
});
