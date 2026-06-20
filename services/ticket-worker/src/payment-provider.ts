export type InternalPaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED';

export class TemporaryProviderFailure extends Error {
  constructor(message = 'Temporary payment provider failure') {
    super(message);
    this.name = 'TemporaryProviderFailure';
  }
}

export interface ProviderPaymentResult {
  provider: string;
  providerPaymentId: string;
  providerStatus: string;
  status: InternalPaymentStatus;
  idempotencyKey: string;
  providerEventId?: string | null;
  rawPayload?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentResult>;
}
