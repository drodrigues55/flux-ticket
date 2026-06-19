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

export class MockPaymentProvider {
  readonly name = 'MOCK';

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
      status: providerStatus === 'approved'
        ? 'APPROVED'
        : providerStatus === 'rejected'
          ? 'REJECTED'
          : providerStatus === 'expired'
            ? 'EXPIRED'
            : providerStatus === 'cancelled'
              ? 'CANCELLED'
              : providerStatus === 'refunded'
                ? 'REFUNDED'
                : 'PENDING',
      idempotencyKey: providerPaymentId,
      providerEventId: `evt-status-${providerPaymentId}`,
      rawPayload: { mock: true, lookup: true, providerPaymentId, providerStatus },
    };
  }
}

export function getPaymentProvider(provider: string) {
  if (provider !== 'MOCK') {
    throw new TemporaryProviderFailure(`Provider ${provider} is not available in Phase 6A`);
  }
  return new MockPaymentProvider();
}
