import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';
import type {
  DashboardOverviewResponse,
  DashboardHeroEvent,
  DashboardAttentionEvent,
  DashboardHealthyEvent,
  DashboardAlert,
  BatchInfo,
  GlobalKpis,
  SalesDataPoint,
  TicketSaleRecord,
  UpcomingPayout,
} from '@flux/types';

// ─────────────────────────────────────────────
// PRIORITY SCORE ALGORITHM
// ─────────────────────────────────────────────

/**
 * Computes a priority score for an event.
 * Higher score = more urgent attention needed.
 * Score drives Hero / Attention / Healthy classification.
 */
function computePriorityScore(params: {
  daysRemaining: number;
  occupancyPct: number;
  capacityTarget: number;
  batches: any[];
  criticalAlerts: number;
  warningAlerts: number;
  salesTrend7d: number;
}): number {
  let score = 0;
  const { daysRemaining, occupancyPct, capacityTarget, batches, criticalAlerts, warningAlerts, salesTrend7d } = params;

  // Time proximity
  if (daysRemaining <= 7) score += 50;
  if (daysRemaining <= 3) score += 30;

  // Occupancy issues
  if (occupancyPct < capacityTarget) score += 20;
  if (occupancyPct >= 80) score += 25;

  // Near sell-out on any batch (< 10% remaining)
  const hasNearSellout = batches.some(b =>
    b.totalQuantity > 0 && b.availableQuantity / b.totalQuantity < 0.10
  );
  if (hasNearSellout) score += 30;

  // Active alerts
  if (criticalAlerts > 0) score += 40;
  if (warningAlerts > 0) score += 20;

  // Sales velocity trends
  if (salesTrend7d < -20) score += 25; // sales slowing significantly
  if (salesTrend7d > 50)  score += 10; // accelerating (positive but monitor)

  return score;
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── 1. Resolve organizer ─────────────────────────────────────────
    let organizer = await prisma.user.findFirst({ where: { role: 'ORGANIZER' } });
    if (!organizer) {
      organizer = await prisma.user.create({
        data: {
          email: 'organizer@flux.com',
          name: 'Organizador',
          password: 'placeholder-hash',
          role: 'ORGANIZER',
        },
      });
    }

    const now = new Date();

    // ── 2. Fetch all events with their batches ───────────────────────
    const events = await prisma.event.findMany({
      where: { organizerId: organizer.id },
      include: {
        batches: true,
        alerts: { where: { resolvedAt: null }, orderBy: { createdAt: 'desc' } },
        payouts: {
          where: { status: { in: ['PENDING', 'SCHEDULED'] } },
          orderBy: { scheduledDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { date: 'asc' },
    });

    // ── 3. Per-event aggregations (using eventId index — no batch join) ──
    // Fetch ticket aggregates for all events in one grouped query
    const ticketAggregates = await prisma.ticket.groupBy({
      by: ['eventId', 'status'],
      where: {
        eventId: { in: events.map(e => e.id) },
        status: { in: ['VALID', 'CONSUMED'] },
      },
      _count: { id: true },
      _sum: { price: true },
    });

    // Build a lookup map: eventId → { revenue, ticketsSold, checkIns }
    const eventMetrics: Record<string, { revenue: number; ticketsSold: number; checkIns: number }> = {};
    for (const row of ticketAggregates) {
      if (!eventMetrics[row.eventId]) {
        eventMetrics[row.eventId] = { revenue: 0, ticketsSold: 0, checkIns: 0 };
      }
      const count = row._count.id;
      const sum = Number(row._sum.price || 0);
      eventMetrics[row.eventId].ticketsSold += count;
      eventMetrics[row.eventId].revenue += sum;
      if (row.status === 'CONSUMED') eventMetrics[row.eventId].checkIns += count;
    }

    // ── 4. Sales trend: last 7d vs previous 7d per event ────────────
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentSnapshots, prevSnapshots] = await Promise.all([
      prisma.dailySalesSnapshot.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: events.map(e => e.id) },
          date: { gte: sevenDaysAgo },
        },
        _sum: { revenue: true },
      }),
      prisma.dailySalesSnapshot.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: events.map(e => e.id) },
          date: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        _sum: { revenue: true },
      }),
    ]);

    const recentMap: Record<string, number> = {};
    const prevMap: Record<string, number> = {};
    for (const r of recentSnapshots) recentMap[r.eventId] = Number(r._sum.revenue || 0);
    for (const r of prevSnapshots)   prevMap[r.eventId]   = Number(r._sum.revenue || 0);

    const salesTrendMap: Record<string, number> = {};
    for (const e of events) {
      const recent = recentMap[e.id] || 0;
      const prev   = prevMap[e.id]   || 0;
      salesTrendMap[e.id] = prev > 0 ? ((recent - prev) / prev) * 100 : (recent > 0 ? 100 : 0);
    }

    // ── 5. Classify events ───────────────────────────────────────────
    interface EventClassified {
      event: typeof events[0];
      metrics: { revenue: number; ticketsSold: number; checkIns: number };
      batches: BatchInfo[];
      totalCapacity: number;
      occupancyPct: number;
      daysRemaining: number;
      priorityScore: number;
      salesTrend7d: number;
      alerts: DashboardAlert[];
    }

    const classified: EventClassified[] = events.map(event => {
      const metrics = eventMetrics[event.id] || { revenue: 0, ticketsSold: 0, checkIns: 0 };
      const totalCapacity = event.batches.reduce((s, b) => s + b.totalQuantity, 0);
      const occupancyPct  = totalCapacity > 0
        ? Math.round((metrics.ticketsSold / totalCapacity) * 100)
        : 0;
      const daysRemaining = Math.max(0, Math.ceil((event.date.getTime() - now.getTime()) / 86400000));
      const salesTrend7d  = salesTrendMap[event.id] || 0;

      const mappedAlerts: DashboardAlert[] = event.alerts.map(a => ({
        id: a.id,
        type: a.type as any,
        severity: a.severity as any,
        message: a.message,
        suggestedAction: a.suggestedAction ?? null,
        createdAt: a.createdAt.toISOString(),
      }));

      const criticalAlerts = mappedAlerts.filter(a => a.severity === 'CRITICAL').length;
      const warningAlerts  = mappedAlerts.filter(a => a.severity === 'WARNING').length;

      const batchInfos: BatchInfo[] = event.batches.map(b => {
        const sold = b.totalQuantity - b.availableQuantity;
        return {
          id: b.id,
          eventId: b.eventId,
          name: b.name,
          price: Number(b.price),
          totalQuantity: b.totalQuantity,
          availableQuantity: b.availableQuantity,
          soldQuantity: sold,
          occupancyPct: b.totalQuantity > 0 ? Math.round((sold / b.totalQuantity) * 100) : 0,
          sectorId: b.sectorId ?? null,
          sectorName: b.sectorName ?? null,
          meiaEntrada: b.meiaEntrada,
          isActive: b.isActive,
          status: b.status ?? (b.isActive ? 'ACTIVE' : 'PAUSED'),
        };
      });

      const priorityScore = computePriorityScore({
        daysRemaining,
        occupancyPct,
        capacityTarget: event.capacityTarget ?? 80,
        batches: event.batches,
        criticalAlerts,
        warningAlerts,
        salesTrend7d,
      });

      return {
        event,
        metrics,
        batches: batchInfos,
        totalCapacity,
        occupancyPct,
        daysRemaining,
        priorityScore,
        salesTrend7d,
        alerts: mappedAlerts,
      };
    });

    // Sort by priority score descending
    classified.sort((a, b) => b.priorityScore - a.priorityScore);

    // ── 6. Build Hero / Attention / Healthy sections ─────────────────
    let heroEvent: DashboardHeroEvent | null = null;
    const attentionEvents: DashboardAttentionEvent[] = [];
    const healthyEvents: DashboardHealthyEvent[] = [];

    for (const c of classified) {
      const nextPayout = c.event.payouts[0]
        ? {
            id: c.event.payouts[0].id,
            amount: Number(c.event.payouts[0].amount),
            scheduledDate: c.event.payouts[0].scheduledDate?.toISOString() ?? '',
            eventTitle: c.event.title,
            status: c.event.payouts[0].status as any,
          }
        : null;

      if (c.priorityScore >= 70 && !heroEvent) {
        heroEvent = {
          eventId: c.event.id,
          title: c.event.title,
          imageUrl: c.event.imageUrl ?? null,
          date: c.event.date.toISOString(),
          venue: c.event.venue || c.event.location,
          grossRevenue: c.metrics.revenue,
          ticketsSold: c.metrics.ticketsSold,
          totalCapacity: c.totalCapacity,
          occupancyPct: c.occupancyPct,
          priorityScore: c.priorityScore,
          activeAlerts: c.alerts,
          nextPayout,
          salesTrend7d: c.salesTrend7d,
          batches: c.batches,
          daysRemaining: c.daysRemaining,
        };
      } else if (c.priorityScore >= 30 && attentionEvents.length < 4) {
        const mainIssue =
          c.alerts[0]?.message ||
          (c.daysRemaining <= 7 ? `Evento em ${c.daysRemaining} dias` : null) ||
          (c.occupancyPct >= 80 ? `Ocupação em ${c.occupancyPct}%` : null) ||
          'Monitoramento recomendado';

        attentionEvents.push({
          eventId: c.event.id,
          title: c.event.title,
          imageUrl: c.event.imageUrl ?? null,
          date: c.event.date.toISOString(),
          mainIssue,
          grossRevenue: c.metrics.revenue,
          occupancyPct: c.occupancyPct,
          daysRemaining: c.daysRemaining,
          priorityScore: c.priorityScore,
          activeAlerts: c.alerts,
        });
      } else {
        healthyEvents.push({
          eventId: c.event.id,
          title: c.event.title,
          imageUrl: c.event.imageUrl ?? null,
          date: c.event.date.toISOString(),
          status: c.event.status as any,
          occupancyPct: c.occupancyPct,
        });
      }
    }

    // ── 7. Global KPIs ──────────────────────────────────────────────
    const totalRevenue   = Object.values(eventMetrics).reduce((s, m) => s + m.revenue, 0);
    const totalTickets   = Object.values(eventMetrics).reduce((s, m) => s + m.ticketsSold, 0);
    const totalCheckIns  = Object.values(eventMetrics).reduce((s, m) => s + m.checkIns, 0);
    const avgOccupancy   = classified.length > 0
      ? Math.round(classified.reduce((s, c) => s + c.occupancyPct, 0) / classified.length)
      : 0;

    const upcomingPayouts: UpcomingPayout[] = await prisma.payout.findMany({
      where: {
        organizerId: organizer.id,
        status: { in: ['PENDING', 'SCHEDULED'] },
      },
      include: { event: { select: { title: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    }).then(ps => ps.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      scheduledDate: p.scheduledDate?.toISOString() ?? '',
      eventTitle: p.event?.title ?? null,
      status: p.status as any,
    })));

    const globalKpis: GlobalKpis = {
      grossRevenue: totalRevenue,
      ticketsSold: totalTickets,
      checkIns: totalCheckIns,
      avgOccupancyPct: avgOccupancy,
      upcomingPayouts,
    };

    // ── 8. Sales history (last 30 days from DailySalesSnapshot) ──────
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rawSnapshots = await prisma.dailySalesSnapshot.findMany({
      where: {
        eventId: { in: events.map(e => e.id) },
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate all events per day
    const dayMap: Record<string, { revenue: number; tickets: number }> = {};
    for (const snap of rawSnapshots) {
      const key = snap.date.toISOString().slice(0, 10);
      if (!dayMap[key]) dayMap[key] = { revenue: 0, tickets: 0 };
      dayMap[key].revenue += Number(snap.revenue);
      dayMap[key].tickets += snap.ticketsSold;
    }

    // Fill all 30 days (0 for days with no sales)
    const salesHistory: SalesDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      salesHistory.push({
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue: dayMap[key]?.revenue || 0,
        tickets: dayMap[key]?.tickets || 0,
      });
    }

    // ── 9. Recent Sales (from SaleLog — real audit trail) ────────────
    const rawSaleLogs = await prisma.saleLog.findMany({
      where: { eventId: { in: events.map(e => e.id) } },
      orderBy: { occurredAt: 'desc' },
      take: 12,
    });

    const recentSales: TicketSaleRecord[] = rawSaleLogs.map(log => ({
      id: log.ticketId,
      eventId: log.eventId,
      eventTitle: log.eventTitle,
      batchId: log.batchId,
      batchName: log.batchName,
      buyerName: log.buyerName,
      buyerEmail: log.buyerEmail,
      holderName: log.holderName ?? null,
      price: Number(log.price),
      status: log.status as any,
      channel: log.channel as any,
      paymentMethod: log.method as any ?? null,
      createdAt: log.occurredAt.toISOString(),
      checkedInAt: null,
    }));

    // ── 10. Batch performance for hero event ──────────────────────────
    const batchPerformance: BatchInfo[] =
      heroEvent
        ? classified.find(c => c.event.id === heroEvent!.eventId)?.batches ?? []
        : classified[0]?.batches ?? [];

    // ── 11. Operational controls (from Redis via api-write telemetry) ──
    let checkoutLimit = 1000;
    let salesPaused   = false;
    let activeCheckoutLocks = 0;

    try {
      const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
      const heroEventId = heroEvent?.eventId || events[0]?.id || '';
      const telRes = await fetch(`${apiWriteUrl}/telemetry?eventId=${heroEventId}`);
      if (telRes.ok) {
        const tel = await telRes.json();
        checkoutLimit       = tel.checkoutLimit ?? 1000;
        salesPaused         = tel.salesPaused ?? false;
      }
    } catch (_) { /* telemetry is non-critical */ }

    // Active checkout locks from DB
    activeCheckoutLocks = await prisma.ticket.count({
      where: {
        buyerCpf: '000.000.000-00',
        expiresAt: { gt: now },
        eventId: { in: events.map(e => e.id) },
      },
    });

    // ── 12. Return full dashboard contract ────────────────────────────
    const response: DashboardOverviewResponse = {
      heroEvent,
      attentionEvents,
      healthyEvents,
      globalKpis,
      salesHistory,
      recentSales,
      batchPerformance,
      activeCheckoutLocks,
      checkoutLimit,
      salesPaused,
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[OVERVIEW API ERROR]', error);
    return res.status(500).json({ error: 'Erro interno ao carregar estatísticas do painel.' });
  }
}
