import type { FinancialFeeEstimate, PaymentStatus } from '@flux/types';

export const FINANCIAL_NOTICES = [
  'Estimated values use the configured platform fee model.',
  'Mock provider is active.',
  'Payouts not available yet.',
  'Real gateway not connected.',
];

export function feeConfig(env = process.env) {
  const percentage = Number(env.PLATFORM_FEE_PERCENT ?? '5');
  const fixedFee = Number(env.PLATFORM_FIXED_FEE ?? '0');
  return {
    percentage: Number.isFinite(percentage) && percentage >= 0 ? percentage : 5,
    fixedFee: Number.isFinite(fixedFee) && fixedFee >= 0 ? fixedFee : 0,
  };
}

export function estimateFees(grossAmount: number, config = feeConfig()): FinancialFeeEstimate {
  const feeAmount = Number(((grossAmount * config.percentage) / 100 + config.fixedFee).toFixed(2));
  return {
    grossAmount,
    percentageFee: config.percentage,
    fixedFee: config.fixedFee,
    feeAmount,
    netAmount: Number(Math.max(0, grossAmount - feeAmount).toFixed(2)),
    label: 'Estimated',
  };
}

export function isApprovedPayment(status: string) {
  return status === 'APPROVED';
}

export function isPendingPayment(status: string) {
  return status === 'PENDING';
}

export function isFailedExpiredPayment(status: string) {
  return ['REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(status);
}

export function emptyPaymentBreakdown(): Record<PaymentStatus, { count: number; amount: number }> {
  return {
    PENDING: { count: 0, amount: 0 },
    APPROVED: { count: 0, amount: 0 },
    REJECTED: { count: 0, amount: 0 },
    EXPIRED: { count: 0, amount: 0 },
    REFUNDED: { count: 0, amount: 0 },
    CANCELLED: { count: 0, amount: 0 },
    FAILED: { count: 0, amount: 0 },
  };
}

export function addMoney(a: number, b: number) {
  return Number((a + b).toFixed(2));
}
