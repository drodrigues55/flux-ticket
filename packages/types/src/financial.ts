import { z } from 'zod';
import type { PaymentStatus } from './payment';

export type FinancialFeeEstimate = {
  grossAmount: number;
  percentageFee: number;
  fixedFee: number;
  feeAmount: number;
  netAmount: number;
  label: 'Estimated';
};

export type FinancialTicketTypeRevenue = {
  ticketTypeId: string | null;
  ticketTypeName: string;
  ticketsSold: number;
  grossRevenue: number;
  approvedRevenue: number;
  pendingRevenue: number;
  estimatedFees: number;
  estimatedNetRevenue: number;
};

export type FinancialBatchRevenue = {
  batchId: string;
  batchName: string;
  ticketTypeId: string | null;
  ticketTypeName: string | null;
  ticketsSold: number;
  ticketsPending: number;
  grossRevenue: number;
  approvedRevenue: number;
  pendingRevenue: number;
  estimatedFees: number;
  estimatedNetRevenue: number;
};

export type FinancialPaymentLedgerItem = {
  paymentId: string;
  orderId: string | null;
  eventId: string;
  eventName: string;
  buyerLabel: string;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amount: number;
  estimatedFees: number;
  estimatedNetAmount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  ticketIssued: boolean;
  deliveryStatus: string;
};

export type FinancialEventSummary = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  startAt: string;
  grossRevenue: number;
  approvedRevenue: number;
  pendingRevenue: number;
  failedExpiredAmount: number;
  estimatedFees: number;
  estimatedNetRevenue: number;
  ticketsSold: number;
  paymentsCount: number;
};

export type FinancialEventDetail = FinancialEventSummary & {
  ticketsReservedOrPending: number;
  paymentStatusBreakdown: Record<PaymentStatus, { count: number; amount: number }>;
  ticketTypeRevenue: FinancialTicketTypeRevenue[];
  batchRevenue: FinancialBatchRevenue[];
  recentPayments: FinancialPaymentLedgerItem[];
};

export type FinancialOverview = {
  grossRevenue: number;
  estimatedFees: number;
  estimatedNetRevenue: number;
  approvedPaymentsTotal: number;
  pendingPaymentsTotal: number;
  failedExpiredPaymentsTotal: number;
  ticketsSold: number;
  eventsWithRevenue: number;
  latestPaymentActivity: FinancialPaymentLedgerItem[];
  feeEstimate: {
    percentage: number;
    fixedFee: number;
    label: 'Estimated';
  };
  notices: string[];
};

export type FinancialCsvExportResult = {
  filename: string;
  contentType: 'text/csv';
  rowCount: number;
};

export const FinancialPaymentStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'REFUNDED',
  'CANCELLED',
  'FAILED',
]);

const optionalIsoDate = z.string().datetime().optional();

export const FinancialPaymentLedgerQuerySchema = z.object({
  status: FinancialPaymentStatusSchema.optional(),
  eventId: z.string().min(1).optional(),
  provider: z.string().min(1).max(64).optional(),
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
  amountMin: z.coerce.number().min(0).optional(),
  amountMax: z.coerce.number().min(0).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'amount', 'status']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).refine((value) => !value.dateFrom || !value.dateTo || new Date(value.dateFrom) <= new Date(value.dateTo), {
  message: 'dateFrom must be before or equal to dateTo',
  path: ['dateFrom'],
}).refine((value) => value.amountMin === undefined || value.amountMax === undefined || value.amountMin <= value.amountMax, {
  message: 'amountMin must be less than or equal to amountMax',
  path: ['amountMin'],
});

export type FinancialPaymentLedgerQuery = z.infer<typeof FinancialPaymentLedgerQuerySchema>;

export const FinancialExportQuerySchema = z.object({
  status: FinancialPaymentStatusSchema.optional(),
  eventId: z.string().min(1).optional(),
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
  provider: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
}).refine((value) => !value.dateFrom || !value.dateTo || new Date(value.dateFrom) <= new Date(value.dateTo), {
  message: 'dateFrom must be before or equal to dateTo',
  path: ['dateFrom'],
});

export type FinancialExportQuery = z.infer<typeof FinancialExportQuerySchema>;

export type PaginatedFinancialPayments = {
  items: FinancialPaymentLedgerItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
