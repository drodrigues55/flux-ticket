import Redis from 'ioredis';
import { logger } from './logger';

export function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  const client = redisUrl
    ? new Redis(redisUrl, { maxRetriesPerRequest: null })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
      });

  client.on('error', (err) => {
    logger.error({ err, service: 'ticket-worker', component: 'redis' }, 'redis client error');
  });
  return client;
}
