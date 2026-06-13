import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FluxEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FluxEngineService.name);
  private redisClient!: Redis;
  private reserveTicketsScriptSha!: string;

  async onModuleInit() {
    // Initialize Redis Client using ioredis
    // For local development, it defaults to localhost:6379
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });

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
      const result = await this.redisClient.evalsha(
        this.reserveTicketsScriptSha,
        2, // Number of keys
        availableTicketsKey,
        reservationLockKey,
        requestedAmount.toString(),
        ttlSeconds.toString()
      );

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
    const ttl = await this.redisClient.ttl(lockKey);
    
    if (ttl < 0) {
      throw new Error('Lock has expired or does not exist');
    }
    
    // Estende o lock por mais 60 segundos
    const result = await this.redisClient.expire(lockKey, 60);
    return result === 1;
  }

  /**
   * Libera o lock temporário e reabastece o estoque do Redis (ação de compensação).
   */
  async releaseTicketLock(batchId: string, userId: string, ticketId: string): Promise<void> {
    const availableTicketsKey = `stock:{${batchId}}`;
    const reservationLockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
    
    const quantityStr = await this.redisClient.get(reservationLockKey);
    if (quantityStr) {
      const quantity = Number(quantityStr) || 1;
      const pipeline = this.redisClient.pipeline();
      pipeline.incrby(availableTicketsKey, quantity);
      pipeline.del(reservationLockKey);
      await pipeline.exec();
    }
  }

  /**
   * Inicializa o estoque de um lote no Redis.
   */
  async setBatchStock(batchId: string, quantity: number): Promise<void> {
    const stockKey = `stock:{${batchId}}`;
    await this.redisClient.set(stockKey, quantity);
  }

  /**
   * Estende a expiração de um lock temporário no Redis.
   */
  async extendTicketLock(userId: string, ticketId: string, batchId: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
    const result = await this.redisClient.expire(lockKey, ttlSeconds);
    return result === 1;
  }
}
