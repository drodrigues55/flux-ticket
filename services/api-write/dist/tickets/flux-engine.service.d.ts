import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class FluxEngineService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private redisClient;
    private reserveTicketsScriptSha;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private loadScripts;
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
     * Inicializa o estoque de um lote no Redis.
     */
    setBatchStock(batchId: string, quantity: number): Promise<void>;
    /**
     * Estende a expiração de um lock temporário no Redis.
     */
    extendTicketLock(userId: string, ticketId: string, batchId: string, ttlSeconds: number): Promise<boolean>;
}
//# sourceMappingURL=flux-engine.service.d.ts.map