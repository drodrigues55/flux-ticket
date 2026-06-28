import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import { parseRedisConfig } from '@flux/types';

@Injectable()
export class FluxEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FluxEngineService.name);
  private redisClient!: Redis;
  private reserveTicketsScriptSha!: string;
  private readonly criticalTimeoutMs = Number(process.env.REDIS_CRITICAL_TIMEOUT_MS) || 1500;
  private readonly nonCriticalTimeoutMs = Number(process.env.REDIS_NON_CRITICAL_TIMEOUT_MS) || 750;

  async onModuleInit() {
    const config = parseRedisConfig('cache', process.env);

    if (process.env.NODE_ENV === 'production' && !config.url && !process.env.REDIS_HOST && !process.env.REDIS_URL) {
      throw new Error('Production environment is missing required Redis configuration');
    }

    const redisOptions = {
      ...config.options,
      connectTimeout: this.criticalTimeoutMs,
      maxRetriesPerRequest: 1,
      commandTimeout: this.criticalTimeoutMs,
    };

    this.redisClient = config.url
      ? new Redis(config.url, redisOptions)
      : new Redis(redisOptions);

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });

    await this.loadScripts();
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.quit();
    }
  }

  private async loadScripts() {
    try {
      let scriptPath = path.join(__dirname, 'reserve_ticket.lua');
      if (!fs.existsSync(scriptPath)) {
        scriptPath = path.join(process.cwd(), 'src/tickets/reserve_ticket.lua');
      }
      
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      // Load script into Redis and keep the SHA for efficient execution
      this.reserveTicketsScriptSha = await this.redisClient.script('LOAD', scriptContent) as string;
      this.logger.log('Lua script for atomic ticket reservation loaded successfully.');
    } catch (error) {
      this.logger.error('Failed to load Lua scripts. Check if the path services/api-write/src/tickets/reserve_ticket.lua exists.', error);
      throw error;
    }
  }

  private withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Redis operation timed out: ${label}`)), timeoutMs);
    });

    return Promise.race([operation, timeout]).finally(() => clearTimeout(timer!));
  }

  private async criticalRedis<T>(label: string, operation: Promise<T>): Promise<T> {
    try {
      return await this.withTimeout(operation, this.criticalTimeoutMs, label);
    } catch (error) {
      this.logger.error(`Critical Redis operation failed: ${label}`, error);
      throw error;
    }
  }

  private async nonCriticalRedis<T>(label: string, operation: Promise<T>, fallback: T): Promise<T> {
    try {
      return await this.withTimeout(operation, this.nonCriticalTimeoutMs, label);
    } catch (error) {
      this.logger.warn(`Non-critical Redis operation degraded: ${label}`, error);
      return fallback;
    }
  }

  /**
   * Atomically reserve tickets for a batch.
   * @param batchId The ID of the ticket batch
   * @param userId The ID of the user buying the ticket
   * @param ticketId The ID of the ticket being reserved
   * @param requestedAmount Number of tickets to reserve
   * @returns boolean True if reservation was successful, false if insufficient tickets
   */
  async reserveTickets(
    batchId: string,
    userId: string,
    ticketId: string,
    requestedAmount: number
  ): Promise<boolean> {
    // Hash Tag guarantees stock key and lock key end up in the same slot
    const availableTicketsKey = `stock:{${batchId}}`;
    const reservationLockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
    
    // Default TTL is 3 minutes (180 seconds)
    const ttlSeconds = 180; 

    try {
      const result = await this.criticalRedis('reserveTickets', this.redisClient.evalsha(
        this.reserveTicketsScriptSha,
        2, // Number of keys
        availableTicketsKey,
        reservationLockKey,
        requestedAmount.toString(),
        ttlSeconds.toString()
      ));

      return result === 1;
    } catch (error) {
      this.logger.error(`Error executing reservation script for batch ${batchId}`, error);
      return false;
    }
  }

  /**
   * Renova o lock temporário de um ingresso por mais 60 segundos (Heartbeat).
   * Retorna/lança erro se o lock já tiver expirado.
   * Executa puramente em memória recebendo o batchId.
   */
  async renewTicketLock(userId: string, ticketId: string, batchId: string): Promise<boolean> {
    const lockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
    
    // Consulta o TTL restante
    const ttl = await this.criticalRedis('renewTicketLock.ttl', this.redisClient.ttl(lockKey));
    
    if (ttl < 0) {
      throw new Error('Lock has expired or does not exist');
    }
    
    // Estende o lock por mais 60 segundos
    const result = await this.criticalRedis('renewTicketLock.expire', this.redisClient.expire(lockKey, 60));
    return result === 1;
  }

  /**
   * Libera o lock temporário e reabastece o estoque do Redis (ação de compensação).
   */
  async releaseTicketLock(batchId: string, userId: string, ticketId: string): Promise<void> {
    const availableTicketsKey = `stock:{${batchId}}`;
    const reservationLockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
    
    const quantityStr = await this.criticalRedis('releaseTicketLock.get', this.redisClient.get(reservationLockKey));
    if (quantityStr) {
      const quantity = Number(quantityStr) || 1;
      const pipeline = this.redisClient.pipeline();
      pipeline.incrby(availableTicketsKey, quantity);
      pipeline.del(reservationLockKey);
      await this.criticalRedis('releaseTicketLock.pipeline', pipeline.exec());
    }
  }

  /**
   * Verifica se o estoque de um lote já foi inicializado no Redis.
   */
  async isStockInitialized(batchId: string): Promise<boolean> {
    const stockKey = `stock:{${batchId}}`;
    const result = await this.criticalRedis('isStockInitialized', this.redisClient.exists(stockKey));
    return result === 1;
  }

  /**
   * Inicializa o estoque de um lote no Redis.
   */
  async setBatchStock(batchId: string, quantity: number): Promise<void> {
    const stockKey = `stock:{${batchId}}`;
    await this.criticalRedis('setBatchStock', this.redisClient.set(stockKey, quantity));
  }

  /**
   * Estende a expiração de um lock temporário no Redis.
   */
  async extendTicketLock(userId: string, ticketId: string, batchId: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
    const result = await this.criticalRedis('extendTicketLock', this.redisClient.expire(lockKey, ttlSeconds));
    return result === 1;
  }

  async getCheckoutLimit(): Promise<number> {
    const limit = await this.criticalRedis('getCheckoutLimit', this.redisClient.get('settings:checkout_limit'));
    return limit ? parseInt(limit, 10) : 1000;
  }

  async getCheckoutLimitSafe(): Promise<number> {
    const limit = await this.nonCriticalRedis('getCheckoutLimitSafe', this.redisClient.get('settings:checkout_limit'), null);
    return limit ? parseInt(limit, 10) : 1000;
  }

  async setCheckoutLimit(limit: number): Promise<void> {
    await this.criticalRedis('setCheckoutLimit', this.redisClient.set('settings:checkout_limit', limit.toString()));
  }

  async isSalesPaused(): Promise<boolean> {
    const paused = await this.criticalRedis('isSalesPaused', this.redisClient.get('settings:sales_paused:global'));
    return paused === 'true';
  }

  async isSalesPausedSafe(): Promise<boolean> {
    const paused = await this.nonCriticalRedis('isSalesPausedSafe', this.redisClient.get('settings:sales_paused:global'), null);
    return paused === 'true';
  }

  async setSalesPaused(paused: boolean): Promise<void> {
    await this.criticalRedis('setSalesPaused', this.redisClient.set('settings:sales_paused:global', paused ? 'true' : 'false'));
  }

  async incrementDeniedAttempts(eventId: string): Promise<number> {
    return this.nonCriticalRedis('incrementDeniedAttempts', this.redisClient.incr(`event:${eventId}:denied_attempts`), 0);
  }

  async getDeniedAttempts(eventId: string): Promise<number> {
    const count = await this.nonCriticalRedis('getDeniedAttempts', this.redisClient.get(`event:${eventId}:denied_attempts`), null);
    return count ? parseInt(count, 10) : 0;
  }

  async registerStaffDevice(eventId: string, deviceId: string, deviceName: string, pendingCount: number, allowedSectorIds: number[] = []): Promise<void> {
    const deviceData = JSON.stringify({
      deviceId,
      deviceName,
      lastSyncTime: new Date().toISOString(),
      pendingSyncCount: pendingCount,
      allowedSectorIds,
    });
    await this.nonCriticalRedis('registerStaffDevice', this.redisClient.hset(`event:${eventId}:staff_devices`, deviceId, deviceData), 0);
  }

  async getStaffDevices(eventId: string): Promise<any[]> {
    const devicesMap = await this.nonCriticalRedis('getStaffDevices', this.redisClient.hgetall(`event:${eventId}:staff_devices`), {});
    return Object.values(devicesMap).map((data) => JSON.parse(data));
  }

  async addLatencyMetric(latencyMs: number): Promise<void> {
    const key = 'telemetry:latency_history';
    await this.nonCriticalRedis('addLatencyMetric', this.redisClient
      .pipeline()
      .lpush(key, latencyMs.toString())
      .ltrim(key, 0, 19)
      .exec(), []);
  }

  async getLatencyHistory(): Promise<number[]> {
    const list = await this.nonCriticalRedis('getLatencyHistory', this.redisClient.lrange('telemetry:latency_history', 0, 19), []);
    return list.map((val) => parseFloat(val));
  }

  async addQueueSizeMetric(size: number): Promise<void> {
    const key = 'telemetry:validation_queue_history';
    await this.nonCriticalRedis('addQueueSizeMetric', this.redisClient
      .pipeline()
      .lpush(key, size.toString())
      .ltrim(key, 0, 19)
      .exec(), []);
  }

  async getQueueSizeHistory(): Promise<number[]> {
    const list = await this.nonCriticalRedis('getQueueSizeHistory', this.redisClient.lrange('telemetry:validation_queue_history', 0, 19), []);
    return list.map((val) => parseInt(val, 10));
  }

  async getRedisInfoStats(): Promise<{ hits: number; misses: number }> {
    try {
      const stats = await this.nonCriticalRedis('getRedisInfoStats', this.redisClient.info('stats'), '');
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      return {
        hits: hitsMatch ? parseInt(hitsMatch[1], 10) : 0,
        misses: missesMatch ? parseInt(missesMatch[1], 10) : 0,
      };
    } catch {
      return { hits: 0, misses: 0 };
    }
  }

  async getQueueStats(queueName: string): Promise<{ waiting: number; active: number; delayed: number; failed: number; completed: number }> {
    const prefix = `bull:${queueName}`;
    const [waiting, active, delayed, failed, completed] = await Promise.all([
      this.nonCriticalRedis('getQueueStats.wait', this.redisClient.llen(`${prefix}:wait`), 0),
      this.nonCriticalRedis('getQueueStats.active', this.redisClient.llen(`${prefix}:active`), 0),
      this.nonCriticalRedis('getQueueStats.delayed', this.redisClient.zcard(`${prefix}:delayed`), 0),
      this.nonCriticalRedis('getQueueStats.failed', this.redisClient.zcard(`${prefix}:failed`), 0),
      this.nonCriticalRedis('getQueueStats.completed', this.redisClient.zcard(`${prefix}:completed`), 0),
    ]);
    return { waiting, active, delayed, failed, completed };
  }
}
