import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { prisma } from '@flux/database';

@Injectable()
export class MonitoringService {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  });

  async getQueueHealth() {
    const queueName = 'TicketValidationQueue';
    const prefix = `bull:${queueName}`;
    const [waiting, active, delayed, failed, completed, pendingOutbox] = await Promise.all([
      this.redis.llen(`${prefix}:wait`).catch(() => 0),
      this.redis.llen(`${prefix}:active`).catch(() => 0),
      this.redis.zcard(`${prefix}:delayed`).catch(() => 0),
      this.redis.zcard(`${prefix}:failed`).catch(() => 0),
      this.redis.zcard(`${prefix}:completed`).catch(() => 0),
      prisma.outboxEvent.count({ where: { status: 'PENDING' } }).catch(() => 0),
    ]);

    const status = failed > 0 || pendingOutbox > 100 ? 'degraded' : 'ok';

    return {
      status,
      timestamp: new Date().toISOString(),
      queues: [
        {
          name: queueName,
          waiting,
          active,
          delayed,
          failed,
          completed,
        },
      ],
      outbox: {
        pending: pendingOutbox,
      },
    };
  }
}
