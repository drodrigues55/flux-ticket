export type InternalPaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED';

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
  scenario?: string;
  idempotencyKey?: string;
}

export interface ProviderPaymentResult {
  provider: string;
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
  provider: string;
  providerPaymentId: string;
  providerStatus: string;
  status: InternalPaymentStatus;
  providerEventId: string;
  rawPayload: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(order: ProviderOrder, paymentInput: PaymentInput): Promise<ProviderPaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentResult>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<ProviderPaymentResult>;
  parseWebhook(payload: unknown, headers: Record<string, unknown>): Promise<ProviderWebhookEvent>;
}

export class TemporaryProviderFailure extends Error {
  constructor(message = 'Temporary payment provider failure') {
    super(message);
    this.name = 'TemporaryProviderFailure';
  }
}
