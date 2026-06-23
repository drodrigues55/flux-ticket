import { prisma } from '@flux/database';
import type {
  BatchInfo,
  DashboardAlert,
  DashboardAttentionEvent,
  DashboardHealthyEvent,
  SalesDataPoint,
  TicketSaleRecord,
} from '@flux/types';
import type {
  DashboardAlertsResponse,
  DashboardEventMetrics,
  DashboardEventPriority,
  DashboardOverview,
  DashboardPriorityEvent,
  LotPerformance,
} from './dashboard.types';

const SOLD_STATUSES = ['VALID', 'CONSUMED'] as const;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value: unknown) {
  return Number(value || 0);
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function daysUntil(date: Date, now: Date) {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / ONE_DAY_MS));
}

function formatDay(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toBatchInfo(batch: any): BatchInfo {
  const soldQuantity = batch.tickets?.filter((ticket: any) => SOLD_STATUSES.includes(ticket.status)).length
    ?? batch.totalQuantity - batch.availableQuantity;

  return {
    id: batch.id,
    eventId: batch.eventId,
    name: batch.name,
    price: Number(batch.price),
    totalQuantity: batch.totalQuantity,
    availableQuantity: batch.availableQuantity,
    soldQuantity,
    occupancyPct: pct(soldQuantity, batch.totalQuantity),
    sectorId: batch.sectorId ?? null,
    sectorName: batch.sectorName ?? null,
    meiaEntrada: batch.meiaEntrada,
    isActive: batch.isActive,
    status: batch.status ?? (batch.isActive ? 'ACTIVE' : 'PAUSED'),
  };
}

function computePriorityScore(params: {
  daysRemaining: number;
  occupancyPct: number;
  capacityTarget: number;
  batches: BatchInfo[];
  criticalAlerts: number;
  warningAlerts: number;
  salesTrend7d: number;
}) {
  let score = 0;
  if (params.daysRemaining <= 7) score += 50;
  if (params.daysRemaining <= 3) score += 30;
  if (params.occupancyPct < params.capacityTarget) score += 20;
  if (params.occupancyPct >= 80) score += 25;
  if (params.batches.some((batch) => batch.totalQuantity > 0 && batch.availableQuantity / batch.totalQuantity < 0.1)) {
    score += 30;
  }
  if (params.criticalAlerts > 0) score += 40;
  if (params.warningAlerts > 0) score += 20;
  if (params.salesTrend7d < -20) score += 25;
  if (params.salesTrend7d > 50) score += 10;
  return score;
}

function buildAlert(params: {
  id: string;
  type: DashboardAlert['type'];
  severity: DashboardAlert['severity'];
  message: string;
  suggestedAction?: string | null;
  createdAt: Date;
}): DashboardAlert {
  return {
    id: params.id,
    type: params.type,
    severity: params.severity,
    message: params.message,
    suggestedAction: params.suggestedAction ?? null,
    createdAt: params.createdAt.toISOString(),
  };
}

export class DashboardService {
  async getOverview(organizerId?: string): Promise<DashboardOverview> {
    const context = await this.loadContext(organizerId);
    const classified = await this.buildEventMetrics(context);

    const heroMetric = classified[0] ?? null;
    const heroEvent = heroMetric && heroMetric.priorityScore >= 70 ? this.toPriorityEvent(heroMetric) : null;
    const attentionEvents = classified
      .filter((event) => event.eventId !== heroEvent?.eventId && event.priorityScore >= 30)
      .slice(0, 4)
      .map((event) => this.toAttentionEvent(event));
    const healthyEvents = classified
      .filter((event) => event.eventId !== heroEvent?.eventId && event.priorityScore < 30)
      .map((event) => this.toHealthyEvent(event));

    const totals = this.getTotals(classified);
    const salesHistory = await this.getSalesHistory(context.eventIds);
    const recentSalesSummary = await this.getRecentSales(context.eventIds);

    return {
      heroEvent,
      attentionEvents,
      healthyEvents,
      globalKpis: {
        grossRevenue: totals.grossRevenue,
        ticketsSold: totals.ticketsSold,
        checkIns: totals.checkIns,
        avgOccupancyPct: totals.occupancyPct,
        upcomingPayouts: [],
      },
      salesHistory,
      recentSales: recentSalesSummary,
      recentSalesSummary,
      batchPerformance: heroMetric?.batches ?? classified[0]?.batches ?? [],
      activeCheckoutLocks: context.activeCheckoutLocks,
      checkoutLimit: null,
      salesPaused: null,
      operationalControls: {
        checkoutLimit: {
          value: null,
          source: 'unavailable',
          status: 'not_configured',
        },
        salesPaused: {
          value: null,
          source: 'unavailable',
          status: 'not_configured',
        },
      },
      totals,
    };
  }

  async getPriorityEvent(organizerId?: string): Promise<DashboardPriorityEvent | null> {
    const context = await this.loadContext(organizerId);
    const [top] = await this.buildEventMetrics(context);
    return top ? this.toPriorityEvent(top) : null;
  }

  async getEventsPriority(organizerId?: string): Promise<DashboardEventPriority[]> {
    const context = await this.loadContext(organizerId);
    const metrics = await this.buildEventMetrics(context);
    return metrics.map((event, index) => {
      if (index === 0 || event.priorityScore >= 70) return this.toPriorityEvent(event);
      if (event.priorityScore >= 30) return this.toAttentionEvent(event);
      return this.toHealthyEvent(event);
    });
  }

  async getLotsPerformance(eventId: string): Promise<LotPerformance[] | null> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        batches: {
          include: {
            tickets: {
              select: {
                id: true,
                status: true,
                price: true,
                checkedInAt: true,
              },
            },
          },
        },
      },
    });

    if (!event) return null;

    return event.batches.map((batch) => {
      const batchInfo = toBatchInfo(batch);
      const soldTickets = batch.tickets.filter((ticket) => SOLD_STATUSES.includes(ticket.status as any));
      const grossRevenue = soldTickets.reduce((sum, ticket) => sum + Number(ticket.price), 0);
      return {
        ...batchInfo,
        grossRevenue,
        averageTicket: soldTickets.length > 0 ? grossRevenue / soldTickets.length : 0,
        checkIns: batch.tickets.filter((ticket) => ticket.status === 'CONSUMED' || ticket.checkedInAt).length,
      };
    });
  }

  async getAlerts(organizerId?: string): Promise<DashboardAlertsResponse> {
    const context = await this.loadContext(organizerId);
    const metrics = await this.buildEventMetrics(context);
    return {
      alerts: metrics.flatMap((event) => event.activeAlerts),
    };
  }

  private async loadContext(organizerId?: string) {
    const where = organizerId ? { organizerId } : {};
    const events = await prisma.event.findMany({
      where,
      include: {
        batches: {
          orderBy: { createdAt: 'asc' },
          include: {
            tickets: {
              select: {
                id: true,
                status: true,
                price: true,
                checkedInAt: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const eventIds = events.map((event) => event.id);
    // TODO(Phase 5 scale): replace broad relation loading with database-side
    // grouped aggregations once dashboard volume and SLO targets are defined.
    const [payments, checkins, history, auditLogs, activeCheckoutLocks] = await Promise.all([
      prisma.payment.findMany({
        where: {
          eventId: { in: eventIds },
          status: 'APPROVED',
        },
        include: {
          buyer: { select: { name: true, email: true } },
          event: { select: { title: true } },
          tickets: {
            select: {
              id: true,
              batchId: true,
              holderName: true,
              price: true,
              status: true,
              channel: true,
              checkedInAt: true,
              batch: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).checkin.findMany({
        where: { eventId: { in: eventIds } },
        orderBy: { syncedAt: 'desc' },
      }),
      (prisma as any).ticketStatusHistory.findMany({
        where: {
          ticket: { eventId: { in: eventIds } },
        },
        include: {
          ticket: { select: { eventId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      (prisma as any).auditLog.findMany({
        where: {
          entityId: { in: eventIds },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.ticket.count({
        where: {
          eventId: { in: eventIds },
          buyerCpf: '000.000.000-00',
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return { events, eventIds, payments, checkins, history, auditLogs, activeCheckoutLocks };
  }

  private async buildEventMetrics(context: Awaited<ReturnType<DashboardService['loadContext']>>): Promise<DashboardEventMetrics[]> {
    const now = new Date();
    const paymentsByEvent = new Map<string, any[]>();
    const checkinsByEvent = new Map<string, any[]>();
    const auditLogsByEvent = new Map<string, any[]>();
    const historyByEvent = new Map<string, any[]>();

    for (const payment of context.payments) {
      const list = paymentsByEvent.get(payment.eventId) ?? [];
      list.push(payment);
      paymentsByEvent.set(payment.eventId, list);
    }

    for (const checkin of context.checkins) {
      const list = checkinsByEvent.get(checkin.eventId) ?? [];
      list.push(checkin);
      checkinsByEvent.set(checkin.eventId, list);
    }

    for (const auditLog of context.auditLogs) {
      const list = auditLogsByEvent.get(auditLog.entityId) ?? [];
      list.push(auditLog);
      auditLogsByEvent.set(auditLog.entityId, list);
    }

    for (const history of context.history) {
      const eventId = history.ticket?.eventId;
      if (!eventId) continue;
      const list = historyByEvent.get(eventId) ?? [];
      list.push(history);
      historyByEvent.set(eventId, list);
    }

    return context.events
      .map((event) => {
        const batches = event.batches.map(toBatchInfo);
        const totalCapacity = batches.reduce((sum, batch) => sum + batch.totalQuantity, 0);
        const ticketsSold = batches.reduce((sum, batch) => sum + batch.soldQuantity, 0);
        const grossRevenue = (paymentsByEvent.get(event.id) ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
        const checkIns = (checkinsByEvent.get(event.id) ?? []).filter((checkin) => checkin.status === 'ACCEPTED').length;
        const occupancyPct = pct(ticketsSold, totalCapacity);
        const salesTrend7d = this.getSalesTrend(paymentsByEvent.get(event.id) ?? [], now);
        const activeAlerts = this.deriveAlerts({
          event,
          batches,
          occupancyPct,
          checkins: checkinsByEvent.get(event.id) ?? [],
          payments: paymentsByEvent.get(event.id) ?? [],
          auditLogs: auditLogsByEvent.get(event.id) ?? [],
          history: historyByEvent.get(event.id) ?? [],
          now,
        });
        const criticalAlerts = activeAlerts.filter((alert) => alert.severity === 'CRITICAL').length;
        const warningAlerts = activeAlerts.filter((alert) => alert.severity === 'WARNING').length;
        const daysRemaining = daysUntil(event.date, now);
        const priorityScore = computePriorityScore({
          daysRemaining,
          occupancyPct,
          capacityTarget: event.capacityTarget ?? 80,
          batches,
          criticalAlerts,
          warningAlerts,
          salesTrend7d,
        });

        return {
          eventId: event.id,
          title: event.title,
          imageUrl: event.imageUrl ?? null,
          date: event.date.toISOString(),
          venue: event.venue || event.location,
          status: event.status,
          grossRevenue,
          ticketsSold,
          averageTicket: ticketsSold > 0 ? grossRevenue / ticketsSold : 0,
          totalCapacity,
          occupancyPct,
          checkIns,
          daysRemaining,
          priorityScore,
          salesTrend7d,
          batches,
          activeAlerts,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  private deriveAlerts(input: {
    event: any;
    batches: BatchInfo[];
    occupancyPct: number;
    checkins: any[];
    payments: any[];
    auditLogs: any[];
    history: any[];
    now: Date;
  }): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];
    const daysRemaining = daysUntil(input.event.date, input.now);
    const target = input.event.capacityTarget ?? 80;

    for (const batch of input.batches) {
      if (batch.totalQuantity > 0 && batch.availableQuantity / batch.totalQuantity <= 0.1) {
        alerts.push(buildAlert({
          id: `${input.event.id}:${batch.id}:low-stock`,
          type: 'LOW_STOCK',
          severity: batch.availableQuantity === 0 ? 'CRITICAL' : 'WARNING',
          message: `${batch.name} está com ${batch.availableQuantity} ingressos disponíveis.`,
          suggestedAction: 'Avaliar abertura de novo lote ou ajuste de comunicação.',
          createdAt: input.event.createdAt,
        }));
      }
    }

    if (daysRemaining <= 7 && input.occupancyPct < target) {
      alerts.push(buildAlert({
        id: `${input.event.id}:slow-sales`,
        type: 'SLOW_SALES',
        severity: daysRemaining <= 3 ? 'CRITICAL' : 'WARNING',
        message: `Evento em ${daysRemaining} dias com ocupação de ${input.occupancyPct}%.`,
        suggestedAction: 'Revisar campanha, preço ou canais de venda.',
        createdAt: input.event.createdAt,
      }));
    }

    const lastDay = new Date(input.now.getTime() - ONE_DAY_MS);
    const checkinIssues = input.checkins.filter((checkin) =>
      checkin.syncedAt >= lastDay && ['DUPLICATE', 'CONFLICT', 'REJECTED'].includes(checkin.status)
    );
    if (checkinIssues.length > 0) {
      alerts.push(buildAlert({
        id: `${input.event.id}:checkin-issues`,
        type: 'CHECKIN_ISSUE',
        severity: checkinIssues.length >= 5 ? 'CRITICAL' : 'WARNING',
        message: `${checkinIssues.length} ocorrências de check-in exigem revisão.`,
        suggestedAction: 'Verificar dispositivos, setores e conflitos offline.',
        createdAt: checkinIssues[0].syncedAt,
      }));
    }

    const rejectedPayments = input.payments.filter((payment) =>
      ['REJECTED', 'REFUNDED', 'CANCELLED'].includes(payment.status)
    );
    if (rejectedPayments.length >= 5) {
      alerts.push(buildAlert({
        id: `${input.event.id}:payment-issues`,
        type: 'FINANCIAL_ISSUE',
        severity: 'WARNING',
        message: `${rejectedPayments.length} pagamentos não aprovados foram registrados.`,
        suggestedAction: 'Revisar falhas de pagamento e suporte ao comprador.',
        createdAt: rejectedPayments[0].createdAt,
      }));
    }

    const recentOperationalFailures = input.auditLogs.filter((log) =>
      log.createdAt >= lastDay && ['STAFF_SCAN_FAILED', 'STAFF_CHECKIN_REJECTED'].includes(log.action)
    );
    if (recentOperationalFailures.length > 0) {
      alerts.push(buildAlert({
        id: `${input.event.id}:audit-operational-failures`,
        type: 'CHECKIN_ISSUE',
        severity: recentOperationalFailures.length >= 10 ? 'CRITICAL' : 'WARNING',
        message: `${recentOperationalFailures.length} falhas operacionais registradas em auditoria.`,
        suggestedAction: 'Revisar logs de auditoria e operação da portaria.',
        createdAt: recentOperationalFailures[0].createdAt,
      }));
    }

    const recentProblemTransitions = input.history.filter((history) =>
      history.createdAt >= lastDay && ['REVOKED'].includes(history.toStatus)
    );
    if (recentProblemTransitions.length > 0) {
      alerts.push(buildAlert({
        id: `${input.event.id}:ticket-status-problems`,
        type: 'CHECKIN_ISSUE',
        severity: recentProblemTransitions.length >= 10 ? 'CRITICAL' : 'WARNING',
        message: `${recentProblemTransitions.length} transições de ingresso exigem revisão.`,
        suggestedAction: 'Revisar histórico de status e motivos de revogação.',
        createdAt: recentProblemTransitions[0].createdAt,
      }));
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity] || a.id.localeCompare(b.id);
    });
  }

  private getSalesTrend(payments: any[], now: Date) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * ONE_DAY_MS);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * ONE_DAY_MS);
    const recent = payments
      .filter((payment) => payment.createdAt >= sevenDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const previous = payments
      .filter((payment) => payment.createdAt >= fourteenDaysAgo && payment.createdAt < sevenDaysAgo)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : (recent > 0 ? 100 : 0);
  }

  private getTotals(metrics: DashboardEventMetrics[]) {
    const grossRevenue = metrics.reduce((sum, event) => sum + event.grossRevenue, 0);
    const ticketsSold = metrics.reduce((sum, event) => sum + event.ticketsSold, 0);
    const totalCapacity = metrics.reduce((sum, event) => sum + event.totalCapacity, 0);
    const checkIns = metrics.reduce((sum, event) => sum + event.checkIns, 0);
    return {
      grossRevenue,
      ticketsSold,
      averageTicket: ticketsSold > 0 ? grossRevenue / ticketsSold : 0,
      occupancyPct: pct(ticketsSold, totalCapacity),
      checkIns,
    };
  }

  private async getSalesHistory(eventIds: string[]): Promise<SalesDataPoint[]> {
    const now = new Date();
    const start = new Date(now.getTime() - 29 * ONE_DAY_MS);
    start.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      where: {
        eventId: { in: eventIds },
        status: 'APPROVED',
        createdAt: { gte: start },
      },
      select: {
        amount: true,
        createdAt: true,
        tickets: { select: { id: true } },
      },
    });

    const dayMap = new Map<string, { revenue: number; tickets: number }>();
    for (const payment of payments) {
      const key = payment.createdAt.toISOString().slice(0, 10);
      const current = dayMap.get(key) ?? { revenue: 0, tickets: 0 };
      current.revenue += Number(payment.amount);
      current.tickets += payment.tickets.length;
      dayMap.set(key, current);
    }

    const history: SalesDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getTime() - i * ONE_DAY_MS);
      const key = day.toISOString().slice(0, 10);
      history.push({
        date: formatDay(day),
        revenue: dayMap.get(key)?.revenue ?? 0,
        tickets: dayMap.get(key)?.tickets ?? 0,
      });
    }
    return history;
  }

  private async getRecentSales(eventIds: string[]): Promise<TicketSaleRecord[]> {
    const payments = await prisma.payment.findMany({
      where: {
        eventId: { in: eventIds },
        status: 'APPROVED',
      },
      include: {
        buyer: { select: { name: true, email: true } },
        event: { select: { title: true } },
        tickets: {
          include: {
            batch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return payments.flatMap((payment) =>
      payment.tickets.map((ticket) => ({
        id: ticket.id,
        eventId: payment.eventId,
        eventTitle: payment.event.title,
        batchId: ticket.batchId,
        batchName: ticket.batch.name,
        buyerName: payment.buyer.name,
        buyerEmail: payment.buyer.email,
        holderName: ticket.holderName ?? null,
        price: Number(ticket.price),
        status: ticket.status as any,
        channel: ticket.channel as any,
        paymentMethod: payment.method as any,
        createdAt: payment.createdAt.toISOString(),
        checkedInAt: ticket.checkedInAt?.toISOString() ?? null,
      }))
    ).slice(0, 12);
  }

  private toPriorityEvent(event: DashboardEventMetrics): DashboardPriorityEvent {
    return {
      eventId: event.eventId,
      title: event.title,
      imageUrl: event.imageUrl,
      date: event.date,
      venue: event.venue,
      grossRevenue: event.grossRevenue,
      ticketsSold: event.ticketsSold,
      totalCapacity: event.totalCapacity,
      occupancyPct: event.occupancyPct,
      priorityScore: event.priorityScore,
      activeAlerts: event.activeAlerts,
      nextPayout: null,
      salesTrend7d: event.salesTrend7d,
      batches: event.batches,
      daysRemaining: event.daysRemaining,
      averageTicket: event.averageTicket,
      checkIns: event.checkIns,
    };
  }

  private toAttentionEvent(event: DashboardEventMetrics): DashboardAttentionEvent {
    return {
      eventId: event.eventId,
      title: event.title,
      imageUrl: event.imageUrl,
      date: event.date,
      mainIssue: event.activeAlerts[0]?.message || `Prioridade operacional ${event.priorityScore}`,
      grossRevenue: event.grossRevenue,
      occupancyPct: event.occupancyPct,
      daysRemaining: event.daysRemaining,
      priorityScore: event.priorityScore,
      activeAlerts: event.activeAlerts,
    };
  }

  private toHealthyEvent(event: DashboardEventMetrics): DashboardHealthyEvent {
    return {
      eventId: event.eventId,
      title: event.title,
      imageUrl: event.imageUrl,
      date: event.date,
      status: event.status as any,
      occupancyPct: event.occupancyPct,
    };
  }
}

export const dashboardService = new DashboardService();
