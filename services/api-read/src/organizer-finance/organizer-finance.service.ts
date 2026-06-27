import { prisma } from '@flux/database';
import type {
  FinancialBatchRevenue,
  FinancialEventDetail,
  FinancialEventSummary,
  FinancialExportQuery,
  FinancialOverview,
  FinancialPaymentLedgerItem,
  FinancialPaymentLedgerQuery,
  FinancialTicketTypeRevenue,
  PaginatedFinancialPayments,
} from '@flux/types';
import { FinancialExportQuerySchema, FinancialPaymentLedgerQuerySchema } from '@flux/types';
import {
  addMoney,
  emptyPaymentBreakdown,
  estimateFees,
  feeConfig,
  FINANCIAL_NOTICES,
  isApprovedPayment,
  isFailedExpiredPayment,
  isPendingPayment,
} from './finance-calculations';

function money(value: any) {
  return Number(value ?? 0);
}

function organizerWhere(organizerId?: string) {
  return organizerId ? { organizerId } : {};
}

function eventScopedPaymentWhere(organizerId?: string, query: Partial<FinancialPaymentLedgerQuery | FinancialExportQuery> = {}) {
  const where: any = {
    event: organizerWhere(organizerId),
  };
  if (query.eventId) where.eventId = query.eventId;
  if ('status' in query && query.status) where.status = query.status;
  if ('provider' in query && query.provider) where.provider = query.provider;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
  }
  if ('amountMin' in query && query.amountMin !== undefined || 'amountMax' in query && query.amountMax !== undefined) {
    where.amount = {};
    if ('amountMin' in query && query.amountMin !== undefined) where.amount.gte = query.amountMin;
    if ('amountMax' in query && query.amountMax !== undefined) where.amount.lte = query.amountMax;
  }
  return where;
}

function paymentResolvedAt(payment: any) {
  if (payment.status === 'APPROVED') return payment.paidAt?.toISOString() ?? payment.updatedAt.toISOString();
  if (['REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED', 'REFUNDED'].includes(payment.status)) return payment.refundedAt?.toISOString() ?? payment.updatedAt.toISOString();
  return null;
}

function deliveryStatus(payment: any) {
  const delivery = payment.order?.outboxEvents?.[0];
  if (!delivery) return payment.order?.status === 'PAID' ? 'PENDING' : 'NOT_READY';
  return delivery.status;
}

function toLedgerItem(payment: any): FinancialPaymentLedgerItem {
  const fee = estimateFees(money(payment.amount));
  return {
    paymentId: payment.id,
    orderId: payment.orderId ?? null,
    eventId: payment.eventId,
    eventName: payment.event?.title ?? 'Untitled event',
    buyerLabel: payment.buyer?.name || payment.buyer?.email || 'Buyer',
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId ?? null,
    status: payment.status,
    amount: money(payment.amount),
    estimatedFees: fee.feeAmount,
    estimatedNetAmount: fee.netAmount,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    resolvedAt: paymentResolvedAt(payment),
    ticketIssued: (payment.tickets ?? []).some((ticket: any) => ticket.status === 'VALID' || ticket.status === 'CONSUMED' || ticket.hmacSignature),
    deliveryStatus: deliveryStatus(payment),
  };
}

function paymentInclude() {
  return {
    event: { select: { id: true, title: true, organizerId: true } },
    buyer: { select: { id: true, name: true, email: true } },
    order: { select: { id: true, status: true, reservationId: true } },
    tickets: { select: { id: true, status: true, hmacSignature: true } },
  };
}

function summarizeEvent(event: any): FinancialEventSummary {
  const payments = event.payments ?? [];
  const grossRevenue = payments.reduce((sum: number, payment: any) => addMoney(sum, money(payment.amount)), 0);
  const approvedRevenue = payments.filter((payment: any) => isApprovedPayment(payment.status)).reduce((sum: number, payment: any) => addMoney(sum, money(payment.amount)), 0);
  const pendingRevenue = payments.filter((payment: any) => isPendingPayment(payment.status)).reduce((sum: number, payment: any) => addMoney(sum, money(payment.amount)), 0);
  const failedExpiredAmount = payments.filter((payment: any) => isFailedExpiredPayment(payment.status)).reduce((sum: number, payment: any) => addMoney(sum, money(payment.amount)), 0);
  const fee = estimateFees(approvedRevenue);
  const ticketsSold = (event.tickets ?? []).filter((ticket: any) => ticket.status === 'VALID' || ticket.status === 'CONSUMED').length;
  return {
    eventId: event.id,
    eventName: event.title,
    eventStatus: event.status,
    startAt: event.date.toISOString(),
    grossRevenue,
    approvedRevenue,
    pendingRevenue,
    failedExpiredAmount,
    estimatedFees: fee.feeAmount,
    estimatedNetRevenue: fee.netAmount,
    ticketsSold,
    paymentsCount: payments.length,
  };
}

function buildTicketTypeRevenue(event: any): FinancialTicketTypeRevenue[] {
  return (event.ticketTypes ?? []).map((ticketType: any) => {
    const batchIds = new Set((ticketType.batches ?? []).map((batch: any) => batch.id));
    const tickets = (event.tickets ?? []).filter((ticket: any) => batchIds.has(ticket.batchId));
    const soldTickets = tickets.filter((ticket: any) => ticket.status === 'VALID' || ticket.status === 'CONSUMED');
    const approvedRevenue = soldTickets.reduce((sum: number, ticket: any) => addMoney(sum, money(ticket.price)), 0);
    const pendingRevenue = tickets.filter((ticket: any) => ticket.status === 'PENDING_PAYMENT' || ticket.status === 'PENDING_VALIDATION').reduce((sum: number, ticket: any) => addMoney(sum, money(ticket.price)), 0);
    const fee = estimateFees(approvedRevenue);
    return {
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      ticketsSold: soldTickets.length,
      grossRevenue: addMoney(approvedRevenue, pendingRevenue),
      approvedRevenue,
      pendingRevenue,
      estimatedFees: fee.feeAmount,
      estimatedNetRevenue: fee.netAmount,
    };
  });
}

function buildBatchRevenue(event: any): FinancialBatchRevenue[] {
  return (event.batches ?? []).map((batch: any) => {
    const tickets = (event.tickets ?? []).filter((ticket: any) => ticket.batchId === batch.id);
    const soldTickets = tickets.filter((ticket: any) => ticket.status === 'VALID' || ticket.status === 'CONSUMED');
    const pendingTickets = tickets.filter((ticket: any) => ticket.status === 'PENDING_PAYMENT' || ticket.status === 'PENDING_VALIDATION');
    const approvedRevenue = soldTickets.reduce((sum: number, ticket: any) => addMoney(sum, money(ticket.price)), 0);
    const pendingRevenue = pendingTickets.reduce((sum: number, ticket: any) => addMoney(sum, money(ticket.price)), 0);
    const fee = estimateFees(approvedRevenue);
    return {
      batchId: batch.id,
      batchName: batch.name,
      ticketTypeId: batch.ticketTypeId ?? null,
      ticketTypeName: batch.ticketType?.name ?? null,
      ticketsSold: soldTickets.length,
      ticketsPending: pendingTickets.length,
      grossRevenue: addMoney(approvedRevenue, pendingRevenue),
      approvedRevenue,
      pendingRevenue,
      estimatedFees: fee.feeAmount,
      estimatedNetRevenue: fee.netAmount,
    };
  });
}

async function loadEvent(eventId: string, organizerId?: string) {
  return prisma.event.findFirst({
    where: { id: eventId, ...organizerWhere(organizerId) },
    include: {
      payments: true,
      tickets: true,
      ticketTypes: { include: { batches: true } },
      batches: { include: { ticketType: true } },
    },
  });
}

export class OrganizerFinanceReadService {
  async getOverview(organizerId?: string): Promise<FinancialOverview> {
    const [payments, tickets, eventsWithRevenue, latest] = await Promise.all([
      prisma.payment.findMany({ where: eventScopedPaymentWhere(organizerId), include: paymentInclude() }),
      prisma.ticket.findMany({ where: { event: organizerWhere(organizerId), status: { in: ['VALID', 'CONSUMED'] as any } }, select: { id: true } }),
      prisma.event.count({ where: { ...organizerWhere(organizerId), payments: { some: {} } } }),
      prisma.payment.findMany({ where: eventScopedPaymentWhere(organizerId), include: paymentInclude(), orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

    const grossRevenue = payments.reduce((sum, payment) => addMoney(sum, money(payment.amount)), 0);
    const approvedPaymentsTotal = payments.filter((payment) => isApprovedPayment(payment.status)).reduce((sum, payment) => addMoney(sum, money(payment.amount)), 0);
    const pendingPaymentsTotal = payments.filter((payment) => isPendingPayment(payment.status)).reduce((sum, payment) => addMoney(sum, money(payment.amount)), 0);
    const failedExpiredPaymentsTotal = payments.filter((payment) => isFailedExpiredPayment(payment.status)).reduce((sum, payment) => addMoney(sum, money(payment.amount)), 0);
    const fee = estimateFees(approvedPaymentsTotal);
    const config = feeConfig();

    return {
      grossRevenue,
      estimatedFees: fee.feeAmount,
      estimatedNetRevenue: fee.netAmount,
      approvedPaymentsTotal,
      pendingPaymentsTotal,
      failedExpiredPaymentsTotal,
      ticketsSold: tickets.length,
      eventsWithRevenue,
      latestPaymentActivity: latest.map(toLedgerItem),
      feeEstimate: { percentage: config.percentage, fixedFee: config.fixedFee, label: 'Estimated' },
      notices: FINANCIAL_NOTICES,
    };
  }

  async listEvents(organizerId?: string): Promise<FinancialEventSummary[]> {
    const events = await prisma.event.findMany({
      where: organizerWhere(organizerId),
      include: { payments: true, tickets: true },
      orderBy: { date: 'desc' },
    });
    return events.map(summarizeEvent);
  }

  async getEventDetail(eventId: string, organizerId?: string): Promise<FinancialEventDetail | null> {
    const event = await loadEvent(eventId, organizerId);
    if (!event) return null;
    const summary = summarizeEvent(event);
    const payments = await prisma.payment.findMany({
      where: eventScopedPaymentWhere(organizerId, { eventId }),
      include: paymentInclude(),
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const paymentStatusBreakdown = emptyPaymentBreakdown();
    for (const payment of event.payments ?? []) {
      paymentStatusBreakdown[payment.status].count += 1;
      paymentStatusBreakdown[payment.status].amount = addMoney(paymentStatusBreakdown[payment.status].amount, money(payment.amount));
    }
    return {
      ...summary,
      ticketsReservedOrPending: (event.tickets ?? []).filter((ticket: any) => ticket.status === 'PENDING_PAYMENT' || ticket.status === 'PENDING_VALIDATION').length,
      paymentStatusBreakdown,
      ticketTypeRevenue: buildTicketTypeRevenue(event),
      batchRevenue: buildBatchRevenue(event),
      recentPayments: payments.map(toLedgerItem),
    };
  }

  async listPayments(queryInput: unknown, organizerId?: string): Promise<PaginatedFinancialPayments> {
    const query = FinancialPaymentLedgerQuerySchema.parse(queryInput);
    const where = eventScopedPaymentWhere(organizerId, query);
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: paymentInclude(),
        orderBy: { [query.sort]: query.direction },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.payment.count({ where }),
    ]);
    return {
      items: items.map(toLedgerItem),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async exportPaymentsCsv(queryInput: unknown, organizerId?: string): Promise<{ filename: string; rows: string[][] }> {
    const query = FinancialExportQuerySchema.parse(queryInput);
    const payments = await prisma.payment.findMany({
      where: eventScopedPaymentWhere(organizerId, query),
      include: paymentInclude(),
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    const rows = [
      ['event id', 'event name', 'order id', 'payment id', 'payment status', 'provider', 'amount', 'fees estimate', 'net estimate', 'created at', 'updated at', 'ticket issued flag'],
      ...payments.map((payment) => {
        const item = toLedgerItem(payment);
        return [item.eventId, item.eventName, item.orderId ?? '', item.paymentId, item.status, item.provider, String(item.amount), String(item.estimatedFees), String(item.estimatedNetAmount), item.createdAt, item.updatedAt, String(item.ticketIssued)];
      }),
    ];
    return { filename: 'payment-ledger.csv', rows };
  }

  async exportEventCsv(eventId: string, queryInput: unknown, organizerId?: string): Promise<{ filename: string; rows: string[][] } | null> {
    const event = await this.getEventDetail(eventId, organizerId);
    if (!event) return null;
    const query = FinancialExportQuerySchema.parse({ ...(queryInput as any), eventId });
    const payments = await prisma.payment.findMany({
      where: eventScopedPaymentWhere(organizerId, query),
      include: paymentInclude(),
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    const rows = [
      ['event id', 'event name', 'order id', 'payment id', 'payment status', 'provider', 'amount', 'fees estimate', 'net estimate', 'created at', 'updated at', 'ticket issued flag'],
      ...payments.map((payment) => {
        const item = toLedgerItem(payment);
        return [item.eventId, item.eventName, item.orderId ?? '', item.paymentId, item.status, item.provider, String(item.amount), String(item.estimatedFees), String(item.estimatedNetAmount), item.createdAt, item.updatedAt, String(item.ticketIssued)];
      }),
    ];
    return { filename: `${event.eventId}-financial-summary.csv`, rows };
  }
}

export function rowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export const organizerFinanceReadService = new OrganizerFinanceReadService();
