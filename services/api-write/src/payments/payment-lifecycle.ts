import type { PaymentStatus, PaymentTransition } from '@flux/types';

export const FINAL_PAYMENT_STATUSES: PaymentStatus[] = ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED'];
export const FINAL_RELEASE_STATUSES: PaymentStatus[] = ['REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED'];

export function isFinalPaymentStatus(status: PaymentStatus | string | null | undefined): boolean {
  return FINAL_PAYMENT_STATUSES.includes(status as PaymentStatus);
}

export function isReleasePaymentStatus(status: PaymentStatus | string | null | undefined): boolean {
  return FINAL_RELEASE_STATUSES.includes(status as PaymentStatus);
}

export function getPaymentTransition(from: PaymentStatus | null, to: PaymentStatus): PaymentTransition {
  if (from === to) {
    return { from, to, action: 'NOOP', allowed: true, reason: 'PAYMENT_STATUS_UNCHANGED' };
  }

  if (from === 'APPROVED' && to !== 'REFUNDED') {
    return { from, to, action: 'NOOP', allowed: false, reason: 'APPROVED_PAYMENT_IS_TERMINAL' };
  }

  if (from && ['REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(from)) {
    return { from, to, action: 'NOOP', allowed: false, reason: 'TERMINAL_PAYMENT_CANNOT_TRANSITION' };
  }

  if (to === 'PENDING') {
    return { from, to, action: 'MARK_PENDING', allowed: true, reason: 'PAYMENT_PENDING' };
  }

  if (to === 'APPROVED') {
    return { from, to, action: 'APPROVE', allowed: true, reason: 'PAYMENT_APPROVED' };
  }

  if (to === 'REFUNDED') {
    return {
      from,
      to,
      action: 'REFUND',
      allowed: from === 'APPROVED',
      reason: from === 'APPROVED' ? 'PAYMENT_REFUNDED' : 'REFUND_REQUIRES_APPROVED_PAYMENT',
    };
  }

  if (isReleasePaymentStatus(to)) {
    return { from, to, action: 'RELEASE', allowed: true, reason: `PAYMENT_${to}` };
  }

  return { from, to, action: 'FAIL', allowed: false, reason: 'UNSUPPORTED_PAYMENT_TRANSITION' };
}

export function assertMockScenarioAllowed(input: { scenario?: string | null; nodeEnv?: string; appEnv?: string }) {
  if (!input.scenario) return;
  if (input.nodeEnv === 'production' || input.appEnv === 'production') {
    throw new Error('Mock payment scenarios are not allowed in production.');
  }
}

export function getPaymentWebhookDedupeKey(input: { providerEventId?: string | null; providerPaymentId: string }): string {
  return input.providerEventId || input.providerPaymentId;
}
