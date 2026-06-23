import express from 'express';
import compression from 'compression';
import { prisma } from '@flux/database';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import type { BatchInfo, EventDetail, EventSummary } from '@flux/types';
import { ok, fail } from './api-response';
import { validateRuntimeEnv } from './env.validation';
import { logger } from './logger';
import { requestIdMiddleware, RequestWithId } from './request-id-middleware';
import { dashboardRouter } from './dashboard/dashboard.controller';
import { getQueueStats, getServiceVersion, renderMetrics } from './observability';
import { captureException, initSentry } from './sentry';

validateRuntimeEnv();
initSentry('api-read');
const app = express();
const port = process.env.PORT || 3002;
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 1,
    });
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

import { authMiddleware } from './auth-middleware';

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
