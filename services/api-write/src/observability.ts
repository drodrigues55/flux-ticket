import { prisma } from '@flux/database';
import Redis from 'ioredis';
import { logger } from './logger';

const service = 'api-write';
const startedAt = Date.now();
const buildTimestamp = new Date().toISOString();
const httpCounts = new Map<string, number>();
const httpLatency = new Map<string, { count: number; sum: number }>();

const QUEUE_NAMES = [
  'payments.webhook',
  'tickets.issue',
  'halfPrice.validateDeadline',
  'checkins.sync',
  'analytics.aggregate',
  'tickets.email',
  'wallet.generate',
  'refunds.process',
];

function redisClient() {
  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: 1,
      });
  client.on('error', (err) => {
    logger.error({ err, service, component: 'observability' }, 'redis client error');
  });
  return client;
}

export function getServiceVersion() {
  return {
    service,
    version: process.env.SERVICE_VERSION || process.env.npm_package_version || '1.0.0',
    commit: process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
    APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    buildTimestamp,
  };
}

export function recordHttpMetric(params: { method: string; route: string; statusCode: number; latency: number }) {
  const key = `${params.method}|${params.route}|${params.statusCode}`;
  httpCounts.set(key, (httpCounts.get(key) || 0) + 1);
  const latencyKey = `${params.method}|${params.route}`;
  const current = httpLatency.get(latencyKey) || { count: 0, sum: 0 };
  current.count += 1;
  current.sum += params.latency;
  httpLatency.set(latencyKey, current);
}

export async function getQueueStats() {
  const redis = redisClient();
  try {
    const queues = await Promise.all(QUEUE_NAMES.map(async (name) => {
      const prefix = `bull:${name}`;
      const deadPrefix = `bull:${name}.dead`;
      const [waiting, active, delayed, failed, completed, deadLetter] = await Promise.all([
        redis.llen(`${prefix}:wait`).catch(() => 0),
        redis.llen(`${prefix}:active`).catch(() => 0),
        redis.zcard(`${prefix}:delayed`).catch(() => 0),
        redis.zcard(`${prefix}:failed`).catch(() => 0),
        redis.zcard(`${prefix}:completed`).catch(() => 0),
        redis.llen(`${deadPrefix}:wait`).catch(() => 0),
      ]);
      const status = failed > 0 || deadLetter > 0 ? 'degraded' : 'ok';
      return { name, status, waiting, active, delayed, failed, completed, deadLetter };
    }));
    return queues;
  } finally {
    redis.disconnect();
  }
}

export async function renderMetrics() {
  const lines: string[] = [];
  lines.push('# HELP flux_http_requests_total HTTP requests by service, method, route and status.');
  lines.push('# TYPE flux_http_requests_total counter');
  for (const [key, value] of httpCounts.entries()) {
    const [method, route, statusCode] = key.split('|');
    lines.push(`flux_http_requests_total{service="${service}",method="${method}",route="${route}",statusCode="${statusCode}"} ${value}`);
  }

  lines.push('# HELP flux_http_request_duration_ms HTTP request duration in milliseconds.');
  lines.push('# TYPE flux_http_request_duration_ms summary');
  for (const [key, value] of httpLatency.entries()) {
    const [method, route] = key.split('|');
    lines.push(`flux_http_request_duration_ms_sum{service="${service}",method="${method}",route="${route}"} ${value.sum}`);
    lines.push(`flux_http_request_duration_ms_count{service="${service}",method="${method}",route="${route}"} ${value.count}`);
  }

  const dbStart = Date.now();
  let dbConnected = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = 1;
  } catch {
    dbConnected = 0;
  }
  lines.push('# HELP flux_database_connected Database connectivity gauge.');
  lines.push('# TYPE flux_database_connected gauge');
  lines.push(`flux_database_connected{service="${service}"} ${dbConnected}`);
  lines.push('# HELP flux_database_query_duration_ms Database health query duration.');
  lines.push('# TYPE flux_database_query_duration_ms gauge');
  lines.push(`flux_database_query_duration_ms{service="${service}"} ${Date.now() - dbStart}`);

  const redis = redisClient();
  let redisConnected = 0;
  try {
    await redis.ping();
    redisConnected = 1;
  } catch {
    redisConnected = 0;
  } finally {
    redis.disconnect();
  }
  lines.push('# HELP flux_redis_connected Redis connectivity gauge.');
  lines.push('# TYPE flux_redis_connected gauge');
  lines.push(`flux_redis_connected{service="${service}"} ${redisConnected}`);

  for (const queue of await getQueueStats()) {
    lines.push(`flux_bullmq_jobs{service="${service}",queue="${queue.name}",state="waiting"} ${queue.waiting}`);
    lines.push(`flux_bullmq_jobs{service="${service}",queue="${queue.name}",state="active"} ${queue.active}`);
    lines.push(`flux_bullmq_jobs{service="${service}",queue="${queue.name}",state="delayed"} ${queue.delayed}`);
    lines.push(`flux_bullmq_jobs{service="${service}",queue="${queue.name}",state="failed"} ${queue.failed}`);
    lines.push(`flux_bullmq_jobs{service="${service}",queue="${queue.name}",state="completed"} ${queue.completed}`);
    lines.push(`flux_bullmq_jobs{service="${service}",queue="${queue.name}",state="dead-letter"} ${queue.deadLetter}`);
  }

  const [reservations, orders, payments, ticketsIssued, checkins] = await Promise.all([
    (prisma as any).reservation.count().catch(() => 0),
    (prisma as any).order.count().catch(() => 0),
    prisma.payment.count().catch(() => 0),
    prisma.ticket.count({ where: { status: { in: ['VALID', 'CONSUMED'] } } }).catch(() => 0),
    (prisma as any).checkin.count().catch(() => 0),
  ]);
  lines.push(`flux_business_total{service="${service}",entity="reservations"} ${reservations}`);
  lines.push(`flux_business_total{service="${service}",entity="orders"} ${orders}`);
  lines.push(`flux_business_total{service="${service}",entity="payments"} ${payments}`);
  lines.push(`flux_business_total{service="${service}",entity="tickets_issued"} ${ticketsIssued}`);
  lines.push(`flux_business_total{service="${service}",entity="checkins"} ${checkins}`);

  return `${lines.join('\n')}\n`;
}
