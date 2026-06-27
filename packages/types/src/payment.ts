export type PaymentProviderName = 'MOCK';

export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'FAILED';

export type PaymentMethodName = 'pix' | 'credit_card';

export type PaymentProviderCapability = {
  provider: PaymentProviderName;
  displayName: string;
  realGatewayAvailable: boolean;
  supportedMethods: PaymentMethodName[];
  supportsWebhooks: boolean;
  supportsRefunds: boolean;
  supportsReconciliation: boolean;
};

export type MockPaymentScenario =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'temporary_failure';

export interface PaymentTransition {
  from: PaymentStatus | null;
  to: PaymentStatus;
  action: 'NOOP' | 'MARK_PENDING' | 'APPROVE' | 'RELEASE' | 'REFUND' | 'FAIL';
  allowed: boolean;
  reason: string;
}

export interface PaymentProviderEvent {
  provider: PaymentProviderName;
  providerPaymentId: string;
  providerStatus: string;
  status: PaymentStatus;
  providerEventId: string | null;
  rawPayload?: unknown;
}

export interface PaymentWebhookInput {
  provider: PaymentProviderName;
  signatureHeader?: string;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body: unknown;
  rawBody?: string;
  requestId?: string | null;
}

export interface PaymentWebhookResult {
  received: boolean;
  valid: boolean;
  duplicate: boolean;
  provider: PaymentProviderName;
  providerPaymentId: string;
  providerEventId: string | null;
  status: PaymentStatus;
  outboxEventId?: string;
}

export interface PaymentReconciliationJob {
  provider: PaymentProviderName;
  paymentId?: string;
  providerPaymentId?: string;
  requestId?: string | null;
}

export interface PaymentReconciliationResult {
  provider: PaymentProviderName;
  checked: number;
  updated: number;
  approved: number;
  released: number;
  pending: number;
  failed: number;
  unsupported: boolean;
  message?: string;
}

export interface PaymentDebugReadModel {
  payment: {
    id: string;
    eventId: string;
    orderId: string | null;
    buyerId: string;
    method: string;
    status: PaymentStatus;
    amount: number;
    installments: number;
    provider: string;
    providerPaymentId: string | null;
    providerStatus: string | null;
    providerEventId: string | null;
    idempotencyKey: string | null;
    paidAt: string | null;
    refundedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  order: {
    id: string;
    status: string;
    reservationId: string | null;
  } | null;
  tickets: Array<{
    id: string;
    status: string;
    batchId: string;
    orderId: string | null;
    reservationId: string | null;
  }>;
  outbox: Array<{
    id: string;
    aggregateType: string;
    aggregateId: string;
    type: string | null;
    status: string;
    attempts: number;
    requestId: string | null;
    createdAt: string;
    processedAt: string | null;
  }>;
  payloadSummary: {
    hasRawPayload: boolean;
    hasRawResponse: boolean;
    rawPayloadKeys: string[];
    rawResponseKeys: string[];
  };
  requestIds: string[];
}

export const MockPaymentProviderCapability: PaymentProviderCapability = {
  provider: 'MOCK',
  displayName: 'Mock Payment Provider',
  realGatewayAvailable: false,
  supportedMethods: ['pix', 'credit_card'],
  supportsWebhooks: true,
  supportsRefunds: true,
  supportsReconciliation: true,
};

export const MockPaymentScenarios: MockPaymentScenario[] = [
  'approved',
  'pending',
  'rejected',
  'expired',
  'cancelled',
  'refunded',
  'failed',
  'temporary_failure',
];
