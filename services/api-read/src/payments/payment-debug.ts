import type { PaymentDebugReadModel } from '@flux/types';

function jsonKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort();
}

export function buildPaymentDebugReadModel(payment: any, outbox: any[]): PaymentDebugReadModel {
  const requestIds = Array.from(
    new Set(outbox.map((item) => item.requestId).filter((value): value is string => typeof value === 'string' && value.length > 0))
  ).sort();

  return {
    payment: {
      id: payment.id,
      eventId: payment.eventId,
      orderId: payment.orderId ?? null,
      buyerId: payment.buyerId,
      method: payment.method,
      status: payment.status,
      amount: Number(payment.amount),
      installments: payment.installments,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? null,
      providerStatus: payment.providerStatus ?? null,
      providerEventId: payment.providerEventId ?? null,
      idempotencyKey: payment.idempotencyKey ?? null,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      refundedAt: payment.refundedAt ? payment.refundedAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    },
    order: payment.order
      ? {
          id: payment.order.id,
          status: payment.order.status,
          reservationId: payment.order.reservationId ?? null,
        }
      : null,
    tickets: (payment.tickets ?? []).map((ticket: any) => ({
      id: ticket.id,
      status: ticket.status,
      batchId: ticket.batchId,
      orderId: ticket.orderId ?? null,
      reservationId: ticket.reservationId ?? null,
    })),
    outbox: outbox.map((item) => ({
      id: item.id,
      aggregateType: item.aggregateType,
      aggregateId: item.aggregateId,
      type: item.type ?? null,
      status: item.status,
      attempts: item.attempts,
      requestId: item.requestId ?? null,
      createdAt: item.createdAt.toISOString(),
      processedAt: item.processedAt ? item.processedAt.toISOString() : null,
    })),
    payloadSummary: {
      hasRawPayload: payment.rawPayload != null,
      hasRawResponse: payment.rawResponse != null,
      rawPayloadKeys: jsonKeys(payment.rawPayload),
      rawResponseKeys: jsonKeys(payment.rawResponse),
    },
    requestIds,
  };
}
