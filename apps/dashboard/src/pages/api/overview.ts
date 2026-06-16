import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Resolve the organizer account
    let organizer = await prisma.user.findFirst({
      where: { role: 'ORGANIZER' },
    });

    if (!organizer) {
      organizer = await prisma.user.create({
        data: {
          email: 'mock-organizer@flux.com',
          name: 'Mock Organizer',
          password: 'password123',
          role: 'ORGANIZER',
        },
      });
    }

    const now = new Date();

    // 2. Fetch gross faturamento (VALID & CONSUMED tickets)
    const revenueAggregate = await prisma.ticket.aggregate({
      _sum: { price: true },
      where: {
        status: { in: ['VALID', 'CONSUMED'] },
        batch: { event: { organizerId: organizer.id } },
      },
    });
    const grossRevenue = Number(revenueAggregate._sum.price || 0);

    // 3. Fetch tickets sold (VALID, CONSUMED, & PENDING_VALIDATION with real CPF)
    const ticketsSold = await prisma.ticket.count({
      where: {
        status: { in: ['VALID', 'CONSUMED', 'PENDING_VALIDATION'] },
        buyerCpf: { not: '000.000.000-00' },
        batch: { event: { organizerId: organizer.id } },
      },
    });

    // 4. Fetch total capacity
    const capacityAggregate = await prisma.ticketBatch.aggregate({
      _sum: { totalQuantity: true },
      where: { event: { organizerId: organizer.id } },
    });
    const totalCapacity = capacityAggregate._sum.totalQuantity || 0;

    // 5. Fetch active checkout locks (reserved guest checkouts before expiration)
    const activeCheckoutLocks = await prisma.ticket.count({
      where: {
        buyerCpf: '000.000.000-00',
        expiresAt: { gt: now },
        batch: { event: { organizerId: organizer.id } },
      },
    });

    // 6. Calculate conversion rate
    const totalEngagements = ticketsSold + activeCheckoutLocks;
    const conversionRate = totalEngagements > 0 ? (ticketsSold / totalEngagements) * 100 : 0;

    // 7. Fetch all batches for management
    const batches = await prisma.ticketBatch.findMany({
      where: { event: { organizerId: organizer.id } },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });

    const serializedBatches = batches.map(b => ({
      id: b.id,
      name: b.name,
      price: Number(b.price),
      totalQuantity: b.totalQuantity,
      availableQuantity: b.availableQuantity,
      sectorName: b.sectorName,
      meiaEntrada: b.meiaEntrada,
      isActive: b.isActive,
      eventTitle: b.event.title,
    }));

    // 8. Fetch pending validation pipeline (deferred validation tickets)
    const validationQueue = await prisma.ticket.findMany({
      where: {
        status: 'PENDING_VALIDATION',
        buyerCpf: { not: '000.000.000-00' },
        batch: { event: { organizerId: organizer.id } },
      },
      include: {
        buyer: true,
        batch: { include: { event: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const serializedValidationQueue = validationQueue.map(t => {
      // SLA deadline: Event Date
      const eventDate = new Date(t.batch.event.date);
      const secondsLeft = Math.max(0, Math.floor((eventDate.getTime() - Date.now()) / 1000));
      return {
        id: t.id,
        buyerName: t.buyer.name,
        buyerEmail: t.buyer.email,
        buyerCpf: t.buyerCpf,
        batchName: t.batch.name,
        eventTitle: t.batch.event.title,
        createdAt: t.createdAt.toISOString(),
        secondsLeft,
        holderName: t.holderName,
        holderCpf: t.holderCpf,
      };
    });

    // 9. Fetch Check-in real-time stats
    const checkInsCount = await prisma.ticket.count({
      where: {
        status: 'CONSUMED',
        batch: { event: { organizerId: organizer.id } },
      },
    });

    // 10. Fetch Recent Sales Feed (Real tickets purchased recently)
    const recentSales = await prisma.ticket.findMany({
      where: {
        status: { in: ['VALID', 'CONSUMED', 'PENDING_VALIDATION'] },
        buyerCpf: { not: '000.000.000-00' },
        batch: { event: { organizerId: organizer.id } },
      },
      include: {
        buyer: true,
        batch: { include: { event: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const serializedRecentSales = recentSales.map(t => {
      const timeStr = t.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return {
        id: t.id,
        buyerName: t.holderName || t.buyer.name,
        buyerEmail: t.buyer.email,
        batchName: t.batch.name,
        eventTitle: t.batch.event.title,
        price: Number(t.price),
        status: t.status,
        timestamp: timeStr,
      };
    });

    // Buscar id do primeiro evento ativo para passar à telemetria de portaria/scanners
    const activeEvent = await prisma.event.findFirst({
      where: { organizerId: organizer.id },
      orderBy: { date: 'asc' },
    });
    const eventId = activeEvent?.id || '';

    let telemetryData: any = {};
    try {
      const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
      const telemetryRes = await fetch(`${apiWriteUrl}/telemetry?eventId=${eventId}`);
      if (telemetryRes.ok) {
        telemetryData = await telemetryRes.json();
      }
    } catch (err) {
      console.error('[TELEMETRY FETCH ERROR] Failed to fetch telemetry from api-write:', err);
    }

    return res.status(200).json({
      grossRevenue,
      ticketsSold,
      totalCapacity,
      activeCheckoutLocks,
      conversionRate,
      batches: serializedBatches,
      validationQueue: serializedValidationQueue,
      checkInsCount,
      recentSales: serializedRecentSales,
      // Configurações & telemetria do Redis
      checkoutLimit: telemetryData.checkoutLimit ?? 1000,
      salesPaused: telemetryData.salesPaused ?? false,
      deniedAttempts: telemetryData.deniedAttempts ?? 0,
      staffDevices: telemetryData.staffDevices ?? [],
      cacheStats: telemetryData.cacheStats ?? { hits: 0, misses: 0 },
      latencyHistory: telemetryData.latencyHistory ?? [],
      queueSizeHistory: telemetryData.queueSizeHistory ?? [],
    });

  } catch (error: any) {
    console.error('[OVERVIEW API ERROR]', error);
    return res.status(500).json({ error: 'Erro interno ao carregar estatísticas do painel.' });
  }
}
