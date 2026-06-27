import type { PaymentProviderName, PaymentStatus } from '@flux/types';

export type InternalPaymentStatus =
  PaymentStatus;

export class TemporaryProviderFailure extends Error {
  constructor(message = 'Temporary payment provider failure') {
    super(message);
    this.name = 'TemporaryProviderFailure';
  }
}

export interface ProviderPaymentResult {
  provider: PaymentProviderName;
  providerPaymentId: string;
  providerStatus: string;
  status: InternalPaymentStatus;
  idempotencyKey: string;
  providerEventId?: string | null;
  rawPayload?: unknown;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentResult>;
}
