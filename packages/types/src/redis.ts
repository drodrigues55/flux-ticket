export interface RedisConfigOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  tls?: any;
  maxRetriesPerRequest?: number | null;
}

export interface ParsedRedisConfig {
  provider: 'local' | 'upstash';
  options: RedisConfigOptions;
  restUrl?: string;
  restToken?: string;
  url?: string;
}

export function parseRedisConfig(
  type: 'default' | 'queue' | 'cache' | 'rate-limit',
  env: Record<string, string | undefined>
): ParsedRedisConfig {
  const provider = (env.REDIS_PROVIDER || 'local').toLowerCase() === 'upstash' ? 'upstash' : 'local';

  let url = env.REDIS_URL;
  if (type === 'queue' && env.QUEUE_REDIS_URL) {
    url = env.QUEUE_REDIS_URL;
  } else if (type === 'cache' && env.CACHE_REDIS_URL) {
    url = env.CACHE_REDIS_URL;
  } else if (type === 'rate-limit' && env.RATE_LIMIT_REDIS_URL) {
    url = env.RATE_LIMIT_REDIS_URL;
  }

  const options: RedisConfigOptions = {};

  // Upstash requires SSL/TLS when connecting over standard Redis protocol (TCP/TLS)
  if (provider === 'upstash') {
    options.tls = {};
    if (url && url.startsWith('redis://')) {
      // Upgrade local protocol prefix to secure redis format for Upstash
      url = url.replace(/^redis:\/\//, 'rediss://');
    }
  }

  if (env.REDIS_PASSWORD) {
    options.password = env.REDIS_PASSWORD;
  }
  if (env.REDIS_USERNAME) {
    options.username = env.REDIS_USERNAME;
  }

  if (!url) {
    options.host = env.REDIS_HOST || 'localhost';
    options.port = Number(env.REDIS_PORT) || 6379;
  }

  return {
    provider,
    options,
    restUrl: env.UPSTASH_REDIS_REST_URL,
    restToken: env.UPSTASH_REDIS_REST_TOKEN,
    url,
  };
}
