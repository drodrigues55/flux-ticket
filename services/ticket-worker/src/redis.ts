import Redis from 'ioredis';
import { logger } from './logger';
import { parseRedisConfig } from '@flux/types';

export function createRedisConnection() {
  const config = parseRedisConfig('queue', process.env);

  if (process.env.NODE_ENV === 'production' && !config.url && !process.env.REDIS_HOST && !process.env.REDIS_URL) {
    throw new Error('Production environment is missing required Redis configuration');
  }

  const redisOptions = {
    ...config.options,
    maxRetriesPerRequest: null,
  };

  const client = config.url
    ? new Redis(config.url, redisOptions)
    : new Redis(redisOptions);

  client.on('error', (err) => {
    logger.error({ err, service: 'ticket-worker', component: 'redis' }, 'redis client error');
  });
  return client;
}
