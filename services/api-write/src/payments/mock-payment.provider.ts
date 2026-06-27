import * as crypto from 'crypto';
import {
  InternalPaymentStatus,
  PaymentInput,
  PaymentProvider,
  ProviderOrder,
  ProviderPaymentResult,
  ProviderWebhookEvent,
  TemporaryProviderFailure,
} from './payment-provider';
import type { MockPaymentScenario } from '@flux/types';

const PIX_QR_CODE = '00020126580014br.gov.bcb.pix2536pix.example.com/qr/v2/mock-code-12345';
const PIX_QR_CODE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function normalizeMockStatus(providerStatus: string): InternalPaymentStatus {
  const normalized = providerStatus.toLowerCase();
  if (normalized === 'approved') return 'APPROVED';
  if (normalized === 'rejected') return 'REJECTED';
  if (normalized === 'expired') return 'EXPIRED';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'CANCELLED';
  if (normalized === 'refunded') return 'REFUNDED';
  if (normalized === 'failed' || normalized === 'error') return 'FAILED';
  return 'PENDING';
}

function scenarioFromInput(input: PaymentInput): string {
  const raw = `${input.scenario ?? ''} ${input.token ?? ''}`.toLowerCase();
  if (raw.includes('provider_error') || raw.includes('temporary_error') || raw.includes('temporary_failure') || raw.includes('mock-error')) return 'temporary_failure';
  if (raw.includes('cancelled') || raw.includes('canceled')) return 'cancelled';
  if (raw.includes('refunded')) return 'refunded';
  if (raw.includes('expired')) return 'expired';
  if (raw.includes('failed') || raw.includes('error')) return 'failed';
  if (raw.includes('rejected') || raw.includes('reject') || raw.includes('fail')) return 'rejected';
  if (raw.includes('pending') || raw.includes('process')) return 'pending';
  if (input.method === 'pix') return 'pending';
  return 'approved';
}

function providerStatusFromScenario(scenario: string): string {
  if (['approved', 'rejected', 'expired', 'cancelled', 'refunded', 'failed'].includes(scenario)) return scenario;
  return 'pending';
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MOCK';

  async createPayment(order: ProviderOrder, paymentInput: PaymentInput): Promise<ProviderPaymentResult> {
    const scenario = scenarioFromInput(paymentInput) as MockPaymentScenario;
    if (scenario === 'temporary_failure') {
      throw new TemporaryProviderFailure('Mock provider temporary failure');
    }

    const providerStatus = providerStatusFromScenario(scenario);
    const providerPaymentId = `mock-${scenario}-${crypto.randomUUID()}`;
    const idempotencyKey = paymentInput.idempotencyKey ?? crypto.randomUUID();

    return {
      provider: this.name,
      providerPaymentId,
      providerStatus,
      status: normalizeMockStatus(providerStatus),
      idempotencyKey,
      providerEventId: `evt-${providerPaymentId}`,
      rawPayload: {
        mock: true,
        scenario,
        orderId: order.id,
        amount: order.amount,
        ticketIds: order.ticketIds ?? [],
      },
      qrCode: paymentInput.method === 'pix' || scenario === 'pending' ? PIX_QR_CODE : undefined,
      qrCodeBase64: paymentInput.method === 'pix' || scenario === 'pending' ? PIX_QR_CODE_BASE64 : undefined,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentResult> {
    if (providerPaymentId.includes('temporary-error') || providerPaymentId.includes('provider-error')) {
      throw new TemporaryProviderFailure('Mock provider status lookup failed temporarily');
    }

    let providerStatus = 'pending';
    if (providerPaymentId.includes('approved') || providerPaymentId.includes('recover-approved')) {
      providerStatus = 'approved';
    } else if (providerPaymentId.includes('rejected') || providerPaymentId.includes('reject')) {
      providerStatus = 'rejected';
    } else if (providerPaymentId.includes('expired')) {
      providerStatus = 'expired';
    } else if (providerPaymentId.includes('cancelled')) {
      providerStatus = 'cancelled';
    } else if (providerPaymentId.includes('refunded')) {
      providerStatus = 'refunded';
    }

    return {
      provider: this.name,
      providerPaymentId,
      providerStatus,
      status: normalizeMockStatus(providerStatus),
      idempotencyKey: providerPaymentId,
      providerEventId: `evt-status-${providerPaymentId}`,
      rawPayload: {
        mock: true,
        lookup: true,
        providerPaymentId,
        providerStatus,
      },
      qrCode: providerStatus === 'pending' ? PIX_QR_CODE : undefined,
      qrCodeBase64: providerStatus === 'pending' ? PIX_QR_CODE_BASE64 : undefined,
    };
  }

  async refundPayment(providerPaymentId: string, amount?: number): Promise<ProviderPaymentResult> {
    return {
      provider: this.name,
      providerPaymentId,
      providerStatus: 'refunded',
      status: 'REFUNDED',
      idempotencyKey: `refund-${providerPaymentId}`,
      providerEventId: `evt-refund-${providerPaymentId}`,
      rawPayload: { mock: true, refund: true, amount: amount ?? null },
    };
  }

  async parseWebhook(payload: any, headers: Record<string, unknown>): Promise<ProviderWebhookEvent> {
    const providerPaymentId = String(payload?.providerPaymentId || payload?.data?.id || payload?.paymentId || '');
    const providerStatus = String(payload?.providerStatus || payload?.status || payload?.data?.status || 'pending');
    const providerEventId = String(payload?.id || payload?.eventId || headers['x-mock-event-id'] || `evt-${providerPaymentId}`);

    return {
      provider: this.name,
      providerPaymentId,
      providerStatus,
      status: normalizeMockStatus(providerStatus),
      providerEventId,
      rawPayload: payload,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}
