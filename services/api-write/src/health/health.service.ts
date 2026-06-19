import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@flux/database';
import Redis from 'ioredis';

function createRedisClient() {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  }
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: 1,
  });
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis = createRedisClient();

  async ready() {
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
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const status = Object.values(checks).every((value) => value === 'ok') ? 'ok' : 'degraded';
    return {
      status,
      service: 'api-write',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
