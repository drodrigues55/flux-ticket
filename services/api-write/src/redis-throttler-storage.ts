import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
import { parseRedisConfig } from '@flux/types';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    const config = parseRedisConfig('rate-limit', process.env);
    const redisOptions = {
      ...config.options,
      maxRetriesPerRequest: 1,
    };
    this.redis = config.url
      ? new Redis(config.url, redisOptions)
      : new Redis(redisOptions);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    const blockSeconds = Math.ceil(blockDuration / 1000);

    const hitKey = `throttler:${throttlerName}:${key}:hits`;
    const blockKey = `throttler:${throttlerName}:${key}:blocked`;

    const blockedTime = await this.redis.ttl(blockKey);
    if (blockedTime > 0) {
      return {
        totalHits: limit,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: blockedTime,
      };
    }

    const pipeline = this.redis.pipeline();
    pipeline.incr(hitKey);
    pipeline.ttl(hitKey);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Pipeline failed');
    }

    const totalHits = results[0][1] as number;
    let timeToExpire = results[1][1] as number;

    if (totalHits === 1 || timeToExpire < 0) {
      await this.redis.expire(hitKey, ttlSeconds);
      timeToExpire = ttlSeconds;
    }

    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (totalHits > limit) {
      isBlocked = true;
      await this.redis.set(blockKey, '1', 'EX', blockSeconds);
      await this.redis.del(hitKey);
      timeToBlockExpire = blockSeconds;
    }

    return {
      totalHits,
      timeToExpire: Math.max(0, timeToExpire),
      isBlocked,
      timeToBlockExpire,
    };
  }

  onModuleDestroy() {
    this.redis.quit();
  }
}
