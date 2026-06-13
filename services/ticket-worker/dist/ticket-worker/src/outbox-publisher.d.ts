/**
 * Busca eventos 'PENDING' na tabela OutboxEvent, enfileira-os no BullMQ e marca como 'PROCESSED'.
 */
export declare function processOutbox(): Promise<void>;
//# sourceMappingURL=outbox-publisher.d.ts.map