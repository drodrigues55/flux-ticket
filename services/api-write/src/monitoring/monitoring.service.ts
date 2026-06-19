import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { prisma } from '@flux/database';
import { getQueueStats } from '../observability';
import { logger } from '../logger';

@Injectable()
export class MonitoringService {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  });

  constructor() {
    this.redis.on('error', (err) => {
      logger.error({ err, service: 'api-write', component: 'monitoring' }, 'redis client error');
    });
  }

  async getQueueHealth() {
    const [queues, pendingOutbox, deadOutbox] = await Promise.all([
      getQueueStats(),
      prisma.outboxEvent.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.outboxEvent.count({ where: { status: 'DEAD' } }).catch(() => 0),
    ]);

    const status = queues.some((queue) => queue.status !== 'ok') || pendingOutbox > 100 || deadOutbox > 0
      ? 'degraded'
      : 'ok';

    return {
      status,
      timestamp: new Date().toISOString(),
      queues,
      outbox: {
        pending: pendingOutbox,
        dead: deadOutbox,
      },
    };
  }
}
