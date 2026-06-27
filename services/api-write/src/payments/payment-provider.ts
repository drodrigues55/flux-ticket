import type { MockPaymentScenario, PaymentProviderEvent, PaymentProviderName, PaymentStatus } from '@flux/types';

export type InternalPaymentStatus =
  PaymentStatus;

export interface ProviderOrder {
  id: string;
  eventId: string;
  buyerId: string;
  amount: number;
  description?: string;
  ticketIds?: string[];
}

export interface PaymentInput {
  method: 'pix' | 'credit_card';
  token?: string;
  installments?: number;
  issuerId?: string;
  email?: string;
  scenario?: MockPaymentScenario | string;
  idempotencyKey?: string;
}

export interface ProviderPaymentResult {
  provider: PaymentProviderName;
  providerPaymentId: string;
  providerStatus: string;
  status: InternalPaymentStatus;
  idempotencyKey: string;
  providerEventId?: string | null;
  rawPayload?: unknown;
  qrCode?: string;
  qrCodeBase64?: string;
}

export interface ProviderWebhookEvent {
  provider: PaymentProviderName;
  providerPaymentId: string;
  providerStatus: string;
  status: InternalPaymentStatus;
  providerEventId: string | null;
  rawPayload: unknown;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(order: ProviderOrder, paymentInput: PaymentInput): Promise<ProviderPaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentResult>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<ProviderPaymentResult>;
  parseWebhook(payload: unknown, headers: Record<string, unknown>): Promise<ProviderWebhookEvent>;
}

export type { PaymentProviderEvent };

export class TemporaryProviderFailure extends Error {
  constructor(message = 'Temporary payment provider failure') {
    super(message);
    this.name = 'TemporaryProviderFailure';
  }
}
