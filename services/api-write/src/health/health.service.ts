import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@flux/database';
import Redis from 'ioredis';
import { getQueueStats, getServiceVersion } from '../observability';
import { logger } from '../logger';

function createRedisClient() {
  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
    : new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: 1,
  });
  client.on('error', (err) => {
    logger.error({ err, service: 'api-write', component: 'health' }, 'redis client error');
  });
  return client;
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis = createRedisClient();

  async ready() {
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
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    try {
      const queues = await getQueueStats();
      checks.queue = queues.some((queue) => queue.status !== 'ok') ? 'degraded' : 'ok';
    } catch {
      checks.queue = 'error';
    }

    const status = Object.values(checks).every((value) => value === 'ok') ? 'ok' : 'degraded';
    return {
      status,
      service: 'api-write',
      checks,
      version: getServiceVersion(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
