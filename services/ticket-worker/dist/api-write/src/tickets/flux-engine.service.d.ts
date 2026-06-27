import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class FluxEngineService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private redisClient;
    private reserveTicketsScriptSha;
    private readonly criticalTimeoutMs;
    private readonly nonCriticalTimeoutMs;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private loadScripts;
    private withTimeout;
    private criticalRedis;
    private nonCriticalRedis;
    /**
     * Atomically reserve tickets for a batch.
     * @param batchId The ID of the ticket batch
     * @param userId The ID of the user buying the ticket
     * @param ticketId The ID of the ticket being reserved
     * @param requestedAmount Number of tickets to reserve
     * @returns boolean True if reservation was successful, false if insufficient tickets
     */
    reserveTickets(batchId: string, userId: string, ticketId: string, requestedAmount: number): Promise<boolean>;
    /**
     * Renova o lock temporário de um ingresso por mais 60 segundos (Heartbeat).
     * Retorna/lança erro se o lock já tiver expirado.
     * Executa puramente em memória recebendo o batchId.
     */
    renewTicketLock(userId: string, ticketId: string, batchId: string): Promise<boolean>;
    /**
     * Libera o lock temporário e reabastece o estoque do Redis (ação de compensação).
     */
    releaseTicketLock(batchId: string, userId: string, ticketId: string): Promise<void>;
    /**
     * Verifica se o estoque de um lote já foi inicializado no Redis.
     */
    isStockInitialized(batchId: string): Promise<boolean>;
    /**
     * Inicializa o estoque de um lote no Redis.
     */
    setBatchStock(batchId: string, quantity: number): Promise<void>;
    /**
     * Estende a expiração de um lock temporário no Redis.
     */
    extendTicketLock(userId: string, ticketId: string, batchId: string, ttlSeconds: number): Promise<boolean>;
    getCheckoutLimit(): Promise<number>;
    getCheckoutLimitSafe(): Promise<number>;
    setCheckoutLimit(limit: number): Promise<void>;
    isSalesPaused(): Promise<boolean>;
    isSalesPausedSafe(): Promise<boolean>;
    setSalesPaused(paused: boolean): Promise<void>;
    incrementDeniedAttempts(eventId: string): Promise<number>;
    getDeniedAttempts(eventId: string): Promise<number>;
    registerStaffDevice(eventId: string, deviceId: string, deviceName: string, pendingCount: number, allowedSectorIds?: number[]): Promise<void>;
    getStaffDevices(eventId: string): Promise<any[]>;
    addLatencyMetric(latencyMs: number): Promise<void>;
    getLatencyHistory(): Promise<number[]>;
    addQueueSizeMetric(size: number): Promise<void>;
    getQueueSizeHistory(): Promise<number[]>;
    getRedisInfoStats(): Promise<{
        hits: number;
        misses: number;
    }>;
    getQueueStats(queueName: string): Promise<{
        waiting: number;
        active: number;
        delayed: number;
        failed: number;
        completed: number;
    }>;
}
//# sourceMappingURL=flux-engine.service.d.ts.map