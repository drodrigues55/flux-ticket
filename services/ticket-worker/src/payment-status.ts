import type { InternalPaymentStatus } from './payment-provider';

export function normalizeProviderStatus(providerStatus: string): InternalPaymentStatus {
  const normalized = providerStatus.toLowerCase();
  if (normalized === 'approved') return 'APPROVED';
  if (normalized === 'rejected') return 'REJECTED';
  if (normalized === 'expired') return 'EXPIRED';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'CANCELLED';
  if (normalized === 'refunded') return 'REFUNDED';
  if (normalized === 'failed' || normalized === 'error') return 'FAILED';
  return 'PENDING';
}
