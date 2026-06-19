import express from 'express';
import { prisma } from '@flux/database';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import type { BatchInfo, EventDetail, EventSummary } from '@flux/types';
import { ok, fail } from './api-response';
import { validateRuntimeEnv } from './env.validation';
import { logger } from './logger';
import { requestIdMiddleware, RequestWithId } from './request-id-middleware';

validateRuntimeEnv();
const app = express();
const port = process.env.PORT || 3002;
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 1,
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
app.use(limiter);
app.use(express.json());

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
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  }, req.requestId || 'req_unknown'));
});

app.get('/health/ready', async (req: RequestWithId, res) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
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

  const status = Object.values(checks).every((value) => value === 'ok') ? 'ok' : 'degraded';
  const statusCode = status === 'ok' ? 200 : 503;
  res.status(statusCode).json(ok({
    status,
    service: 'api-read',
    checks,
    timestamp: new Date().toISOString(),
  }, req.requestId || 'req_unknown'));
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
      include: { batches: true },
      orderBy: { date: 'asc' },
    });

    const result: EventDetail[] = events.map((event) => {
      const batches = event.batches.map(toBatchInfo);
      const agg = computeEventAggregates(batches);
      return {
        id: event.id,
        title: event.title,
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
        batches,
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
      include: { batches: true },
    });

    if (!event) {
      return res.status(404).json(fail({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found',
        statusCode: 404,
        requestId: (req as RequestWithId).requestId || 'req_unknown',
      }));
    }

    const batches = event.batches.map(toBatchInfo);
    const agg = computeEventAggregates(batches);

    const result: EventDetail = {
      id: event.id,
      title: event.title,
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
      batches,
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

/**
 * GET /events/:id/staff-sync
 * Ultra-lightweight endpoint for offline PWA check-in sync.
 * Returns ticket IDs, HMAC signatures, and sector IDs for VALID tickets.
 */
app.get('/events/:id/staff-sync', authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  try {
    const tickets = await prisma.ticket.findMany({
      where: { eventId, status: 'VALID' },
      select: {
        id: true,
        hmacSignature: true,
        batch: { select: { sectorId: true } },
      },
    });

    const payload = tickets.map((t) => ({
      ticket_id: t.id,
      hmacSignature: t.hmacSignature,
      sectorId: t.batch?.sectorId ?? null,
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

app.listen(port, () => {
  logger.info({ port }, 'api-read service listening');
});

process.on('SIGTERM', () => {
  redis.disconnect();
});
