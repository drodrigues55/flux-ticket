import express from 'express';
import compression from 'compression';
import { prisma } from '@flux/database';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { BatchInfo, EventDetail, EventSummary, parseRedisConfig } from '@flux/types';
import { ok, fail } from './api-response';
import { validateRuntimeEnv } from './env.validation';
import { logger } from './logger';
import { requestIdMiddleware, RequestWithId } from './request-id-middleware';
import { dashboardRouter } from './dashboard/dashboard.controller';
import { organizerEventsRouter } from './organizer-events/organizer-events.controller';
import { organizerFinanceRouter } from './organizer-finance/organizer-finance.controller';
import { orgRouter } from './org/org.controller';
import { buildPaymentDebugReadModel } from './payments/payment-debug';
import { getQueueStats, getServiceVersion, renderMetrics } from './observability';
import { captureException, initSentry } from './sentry';

validateRuntimeEnv();
initSentry('api-read');
const app = express();
const port = process.env.PORT || 3002;

const config = parseRedisConfig('cache', process.env);
if (process.env.NODE_ENV === 'production' && !config.url && !process.env.REDIS_HOST && !process.env.REDIS_URL) {
  throw new Error('Production environment is missing required Redis configuration');
}

const redisOptions = {
  ...config.options,
  maxRetriesPerRequest: 1,
};

const redis = config.url
  ? new Redis(config.url, redisOptions)
  : new Redis(redisOptions);

redis.on('error', (err) => {
  logger.error({ err, service: 'api-read' }, 'redis client error');
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: RequestWithId, res) => {
    res.status(429).json(fail({
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
      requestId: req.requestId || 'req_unknown',
    }));
  },
});

app.use(requestIdMiddleware);
app.use(compression({ threshold: 0 }));

// CORS & Security Headers Middleware (Helmet Equivalent)
app.use((req: any, res: any, next: any) => {
  const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (isProd) {
    const allowed = ['https://fluxtickets.com', 'https://staff.fluxtickets.com'];
    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=15768000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

app.use(limiter);
app.use(express.json());
app.use('/dashboard', dashboardRouter);
app.use('/organizer/events', organizerEventsRouter);
app.use('/organizer/finance', organizerFinanceRouter);
app.use('/organization', orgRouter);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Converts a raw TicketBatch DB row to the shared BatchInfo contract.
 * All computed fields (soldQuantity, occupancyPct) are resolved server-side.
 */
function toBatchInfo(batch: any): BatchInfo {
  const sold = batch.totalQuantity - batch.availableQuantity;
  return {
    id: batch.id,
    eventId: batch.eventId,
    name: batch.name,
    price: Number(batch.price),
    totalQuantity: batch.totalQuantity,
    availableQuantity: batch.availableQuantity,
    soldQuantity: sold,
    occupancyPct: batch.totalQuantity > 0
      ? Math.round((sold / batch.totalQuantity) * 100)
      : 0,
    sectorId: batch.sectorId ?? null,
    sectorName: batch.sectorName ?? null,
    meiaEntrada: batch.meiaEntrada,
    isActive: batch.isActive,
    status: batch.status ?? (batch.isActive ? 'ACTIVE' : 'PAUSED'),
  };
}

/**
 * Computes event-level aggregated fields from batches.
 */
function computeEventAggregates(batches: BatchInfo[]) {
  const totalCapacity = batches.reduce((s, b) => s + b.totalQuantity, 0);
  const totalSold = batches.reduce((s, b) => s + b.soldQuantity, 0);
  return {
    totalCapacity,
    totalSold,
    occupancyPct: totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
  };
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.get('/health/live', (req: RequestWithId, res) => {
  res.json(ok({
    status: 'ok',
    service: 'api-read',
    version: getServiceVersion(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  }, req.requestId || 'req_unknown'));
});

app.get('/health/ready', async (req: RequestWithId, res) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    queue: 'unknown',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  try {
    const queues = await getQueueStats();
    checks.queue = queues.some((queue) => queue.failed > 0 || queue.deadLetter > 0) ? 'degraded' : 'ok';
  } catch {
    checks.queue = 'error';
  }

  const status = Object.values(checks).every((value) => value === 'ok') ? 'ok' : 'degraded';
  const statusCode = status === 'ok' ? 200 : 503;
  res.status(statusCode).json(ok({
    status,
    service: 'api-read',
    checks,
    version: getServiceVersion(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  }, req.requestId || 'req_unknown'));
});

app.get('/version', (req: RequestWithId, res) => {
  res.json(ok(getServiceVersion(), req.requestId || 'req_unknown'));
});

app.get('/metrics', async (_req, res) => {
  if (process.env.PROMETHEUS_ENABLED !== 'true') {
    res.status(404).send('metrics disabled');
    return;
  }
  res.type('text/plain').send(await renderMetrics());
});

/**
 * GET /events
 * Returns full event catalog. Includes computed occupancyPct per batch.
 * Supports optional ?categoryId filter.
 */
app.get('/events', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where = categoryId ? { categoryId: Number(categoryId) } : {};

    const events = await prisma.event.findMany({
      where,
      include: { ticketTypes: { include: { batches: true } } },
      orderBy: { date: 'asc' },
    });

    const result: EventDetail[] = events.map((event) => {
      const ticketTypes = event.ticketTypes.map(tt => ({
        id: tt.id,
        name: tt.name,
        description: tt.description,
        capacity: tt.capacity,
        visibility: tt.visibility,
        transferable: tt.transferable,
        refundable: tt.refundable,
        purchaseLimit: tt.purchaseLimit,
        isActive: tt.isActive,
        batches: tt.batches.map(toBatchInfo),
      }));
      const allBatches = ticketTypes.flatMap(tt => tt.batches);
      const agg = computeEventAggregates(allBatches);
      return {
        id: event.id,
        title: event.title,
        slug: event.slug ?? null,
        description: event.description ?? null,
        date: event.date.toISOString(),
        location: event.location,
        venue: event.venue ?? null,
        imageUrl: event.imageUrl ?? null,
        status: event.status as any,
        organizerId: event.organizerId,
        categoryId: event.categoryId ?? null,
        tags: event.tags ?? [],
        capacityTarget: event.capacityTarget ?? null,
        batches: allBatches,
        ticketTypes,
        ...agg,
        grossRevenue: 0, // not computed in public catalog; available in dashboard API
      };
    });

    res.json(result);
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error }, 'GET /events failed');
    res.status(500).json(fail({
      code: 'EVENT_CATALOG_ERROR',
      message: 'Failed to retrieve events catalog',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

/**
 * GET /events/:id
 * Returns full event detail including batches with computed metrics.
 */
app.get('/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { ticketTypes: { include: { batches: true } } },
    });

    if (!event) {
      return res.status(404).json(fail({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const ticketTypes = event.ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      capacity: tt.capacity,
      visibility: tt.visibility,
      transferable: tt.transferable,
      refundable: tt.refundable,
      purchaseLimit: tt.purchaseLimit,
      isActive: tt.isActive,
      batches: tt.batches.map(toBatchInfo),
    }));
    const allBatches = ticketTypes.flatMap(tt => tt.batches);
    const agg = computeEventAggregates(allBatches);

    const result: EventDetail = {
      id: event.id,
      title: event.title,
      slug: event.slug ?? null,
      description: event.description ?? null,
      date: event.date.toISOString(),
      location: event.location,
      venue: event.venue ?? null,
      imageUrl: event.imageUrl ?? null,
      status: event.status as any,
      organizerId: event.organizerId,
      categoryId: event.categoryId ?? null,
      tags: event.tags ?? [],
      capacityTarget: event.capacityTarget ?? null,
      batches: allBatches,
      ticketTypes,
      ...agg,
      grossRevenue: 0,
    };

    res.json(result);
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error, eventId: req.params.id }, 'GET /events/:id failed');
    res.status(500).json(fail({
      code: 'EVENT_DETAIL_ERROR',
      message: 'Failed to retrieve event',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.get('/public/events', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const where: any = { status: 'PUBLISHED' };
    if (categoryId) {
      where.categoryId = Number(categoryId);
    }
    const events = await prisma.event.findMany({
      where,
      include: { ticketTypes: { where: { archivedAt: null, visibility: true, isActive: true }, include: { batches: { where: { archivedAt: null, isActive: true } } } } },
      orderBy: { date: 'asc' },
    });

    const result = events.map((event) => {
      const ticketTypes = event.ticketTypes.map(tt => ({
        id: tt.id,
        name: tt.name,
        description: tt.description,
        capacity: tt.capacity,
        batches: tt.batches.map(toBatchInfo),
      }));
      const allBatches = ticketTypes.flatMap(tt => tt.batches);
      const agg = computeEventAggregates(allBatches);
      
      const startingPrice = allBatches.length > 0 
        ? Math.min(...allBatches.map(b => b.price)) 
        : null;

      return {
        id: event.id,
        title: event.title,
        slug: event.slug ?? null,
        description: event.description ?? null,
        date: event.date.toISOString(),
        location: event.location,
        venue: event.venue ?? null,
        imageUrl: event.imageUrl ?? null,
        organizerId: event.organizerId,
        categoryId: event.categoryId ?? null,
        startingPrice,
        ...agg,
      };
    });

    res.json(result);
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error }, 'GET /public/events failed');
    res.status(500).json(fail({
      code: 'PUBLIC_EVENTS_ERROR',
      message: 'Failed to retrieve public events catalog',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.get('/public/events/:slug', async (req, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: {
        ticketTypes: {
          where: { archivedAt: null, visibility: true, isActive: true },
          include: {
            batches: {
              where: { archivedAt: null, isActive: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      },
    });

    if (!event) {
      return res.status(404).json(fail({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found or not published',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const ticketTypes = event.ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      capacity: tt.capacity,
      purchaseLimit: tt.purchaseLimit,
      batches: tt.batches.map(toBatchInfo),
    }));
    const allBatches = ticketTypes.flatMap(tt => tt.batches);
    const agg = computeEventAggregates(allBatches);

    const result = {
      id: event.id,
      title: event.title,
      slug: event.slug ?? null,
      description: event.description ?? null,
      date: event.date.toISOString(),
      location: event.location,
      venue: event.venue ?? null,
      imageUrl: event.imageUrl ?? null,
      organizerId: event.organizerId,
      categoryId: event.categoryId ?? null,
      ticketTypes,
      ...agg,
    };

    res.json(result);
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error, slug: req.params.slug }, 'GET /public/events/:slug failed');
    res.status(500).json(fail({
      code: 'PUBLIC_EVENT_DETAIL_ERROR',
      message: 'Failed to retrieve event details',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.get('/public/events/:slug/tickets', async (req, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: {
        ticketTypes: {
          where: { archivedAt: null, visibility: true, isActive: true },
          include: {
            batches: {
              where: { archivedAt: null, isActive: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      },
    });

    if (!event) {
      return res.status(404).json(fail({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found or not published',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const ticketTypes = event.ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      capacity: tt.capacity,
      purchaseLimit: tt.purchaseLimit,
      batches: tt.batches.map(toBatchInfo),
    }));

    res.json(ticketTypes);
  } catch (error) {
    res.status(500).json(fail({
      code: 'PUBLIC_EVENT_TICKETS_ERROR',
      message: 'Failed to retrieve event tickets',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.get('/public/orders/:orderId/confirmation', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { event: true, tickets: { include: { batch: true } } },
    });

    if (!order) {
      return res.status(404).json(fail({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const deliveryJob = await prisma.outboxEvent.findFirst({
      where: { aggregateType: 'ORDER_PAID', aggregateId: order.id, type: 'tickets.delivery' },
      orderBy: { createdAt: 'desc' }
    });
    const deliveryAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'Order',
        entityId: order.id,
        action: { in: ['EMAIL_DELIVERY_SENT', 'EMAIL_DELIVERY_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let deliveryStatus = 'PENDING';
    if (deliveryAudit?.action === 'EMAIL_DELIVERY_SENT') {
      deliveryStatus = 'DELIVERED';
    } else if (deliveryAudit?.action === 'EMAIL_DELIVERY_FAILED') {
      deliveryStatus = 'FAILED';
    } else if (deliveryJob) {
      if (deliveryJob.status === 'PROCESSED') {
        deliveryStatus = 'PENDING';
      } else if (deliveryJob.status === 'FAILED') {
        deliveryStatus = 'FAILED';
      }
    }

    const tickets = order.tickets.map(t => ({
      id: t.id,
      holderName: t.holderName,
      holderCpf: t.holderCpf,
      price: t.price.toNumber(),
      status: t.status,
      batch: {
        name: t.batch.name,
      },
    }));

    res.json({
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.netAmount.toNumber(),
        deliveryStatus,
        event: {
          title: order.event.title,
          date: order.event.date.toISOString(),
          location: order.event.location,
        },
        tickets,
      }
    });
  } catch (error) {
    res.status(500).json(fail({
      code: 'CONFIRMATION_ERROR',
      message: 'Failed to retrieve confirmation details',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.get('/public/tickets/:ticketId', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.ticketId },
      include: {
        batch: { include: { event: true } },
      }
    });

    if (!ticket) {
      return res.status(404).json(fail({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    res.json({
      id: ticket.id,
      status: ticket.status,
      meiaEntrada: ticket.meiaEntrada,
      price: ticket.price.toNumber(),
      holderName: ticket.holderName,
      holderCpf: ticket.holderCpf,
      hmacSignature: ticket.hmacSignature,
      event: {
        title: ticket.batch.event.title,
        date: ticket.batch.event.date.toISOString(),
        location: ticket.batch.event.location,
        venue: ticket.batch.event.venue,
      },
      batch: {
        name: ticket.batch.name,
      }
    });
  } catch (error) {
    res.status(500).json(fail({
      code: 'TICKET_DETAIL_ERROR',
      message: 'Failed to retrieve ticket details',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

import { authMiddleware } from './auth-middleware';

app.get('/payments/:paymentId/debug', authMiddleware, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: { order: true, tickets: true },
    });

    if (!payment) {
      return res.status(404).json(fail({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const aggregateIds = [payment.id, payment.providerPaymentId, payment.providerEventId, payment.orderId]
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    const outbox = await prisma.outboxEvent.findMany({
      where: {
        OR: [
          { aggregateId: { in: aggregateIds } },
          { payload: { path: ['paymentId'], equals: payment.id } as any },
          ...(payment.providerPaymentId ? [{ payload: { path: ['providerPaymentId'], equals: payment.providerPaymentId } as any }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    res.json(ok(buildPaymentDebugReadModel(payment, outbox), (req as RequestWithId).requestId || 'req_unknown'));
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error, paymentId: req.params.paymentId }, 'GET /payments/:paymentId/debug failed');
    res.status(500).json(fail({
      code: 'PAYMENT_DEBUG_ERROR',
      message: 'Failed to retrieve payment debug model',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

function parseSectorFilter(value: unknown): number[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

async function buildOfflineBundle(eventId: string, allowedSectorIds: number[] = []) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      date: true,
      location: true,
      batches: {
        select: {
          sectorId: true,
          sectorName: true,
        },
      },
    },
  });

  if (!event) return null;

  const sectorRestricted = allowedSectorIds.length > 0;
  const tickets = await prisma.ticket.findMany({
    where: {
      eventId,
      status: 'VALID',
      hmacSignature: { not: null },
      batch: sectorRestricted ? { sectorId: { in: allowedSectorIds } } : undefined,
    },
    select: {
      id: true,
      hmacSignature: true,
      holderName: true,
      batch: {
        select: {
          id: true,
          sectorId: true,
          sectorName: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  const sectorMap = new Map<string, { sectorId: number | null; sectorName: string | null }>();
  for (const batch of event.batches) {
    const key = `${batch.sectorId ?? 'none'}:${batch.sectorName ?? ''}`;
    sectorMap.set(key, {
      sectorId: batch.sectorId ?? null,
      sectorName: batch.sectorName ?? null,
    });
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      date: event.date.toISOString(),
      location: event.location,
    },
    generatedAt: new Date().toISOString(),
    policy: {
      allowedSectorIds,
      sectorRestricted,
    },
    sectors: Array.from(sectorMap.values()),
    tickets: tickets.map((ticket) => ({
      ticket_id: ticket.id,
      ticketId: ticket.id,
      hmacSignature: ticket.hmacSignature,
      holderName: ticket.holderName ?? null,
      batchId: ticket.batch.id,
      sectorId: ticket.batch.sectorId ?? null,
      sectorName: ticket.batch.sectorName ?? null,
    })),
  };
}

/**
 * GET /events/:id/staff-sync
 * Ultra-lightweight endpoint for offline PWA check-in sync.
 * Returns ticket IDs, HMAC signatures, and sector IDs for VALID tickets.
 */
app.get('/events/:id/staff-sync', authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  try {
    const bundle = await buildOfflineBundle(eventId);

    if (!bundle) {
      return res.status(404).json(fail({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const payload = bundle.tickets.map((t) => ({
      ticket_id: t.ticket_id,
      hmacSignature: t.hmacSignature,
      sectorId: t.sectorId ?? null,
    }));

    res.json(payload);
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error, eventId }, 'GET /events/:id/staff-sync failed');
    res.status(500).json(fail({
      code: 'STAFF_SYNC_ERROR',
      message: 'Failed to synchronize event tickets',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.get('/staff/events/:eventId/offline-bundle', authMiddleware, async (req, res) => {
  const eventId = req.params.eventId;
  const allowedSectorIds = parseSectorFilter(req.query.sectorIds);

  try {
    const bundle = await buildOfflineBundle(eventId, allowedSectorIds);

    if (!bundle) {
      return res.status(404).json(fail({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    res.json(ok(bundle, (req as RequestWithId).requestId || 'req_unknown'));
  } catch (error) {
    logger.error({ requestId: (req as RequestWithId).requestId, err: error, eventId }, 'GET /staff/events/:eventId/offline-bundle failed');
    res.status(500).json(fail({
      code: 'STAFF_OFFLINE_BUNDLE_ERROR',
      message: 'Failed to build staff offline bundle',
      statusCode: 500,
      requestId: (req as RequestWithId).requestId || 'req_unknown',
    }));
  }
});

app.listen(port, () => {
  logger.info({ port }, 'api-read service listening');
});

process.on('SIGTERM', () => {
  redis.disconnect();
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled rejection');
  captureException(reason, { service: 'api-read', type: 'unhandledRejection' });
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'uncaught exception');
  captureException(error, { service: 'api-read', type: 'uncaughtException' });
});
