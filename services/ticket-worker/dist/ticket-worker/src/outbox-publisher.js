"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOutbox = processOutbox;
const database_1 = require("@flux/database");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});
const ticketValidationQueue = new bullmq_1.Queue('TicketValidationQueue', { connection: connection });
/**
 * Busca eventos 'PENDING' na tabela OutboxEvent, enfileira-os no BullMQ e marca como 'PROCESSED'.
 */
async function processOutbox() {
    const events = await database_1.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: 100,
        orderBy: { createdAt: 'asc' },
    });
    if (events.length > 0) {
        console.log(`[PUBLISHER] Encontrados ${events.length} eventos pendentes no Outbox.`);
    }
    for (const event of events) {
        try {
            const payload = event.payload;
            if (event.aggregateType === 'TICKET_RESERVED') {
                // Se for meia-entrada, aplica o SLA de 24 horas (atraso no job)
                // Para testes práticos, permitimos configurar um delay menor (ex: via env)
                const delay = payload.isHalfPrice
                    ? (process.env.VALIDATION_DELAY_MS ? Number(process.env.VALIDATION_DELAY_MS) : 24 * 60 * 60 * 1000)
                    : 0;
                if (payload.isHalfPrice) {
                    console.log(`[PUBLISHER] Enfileirando meia-entrada do ingresso ${payload.ticketId} com atraso (SLA) de ${delay}ms.`);
                }
                else {
                    console.log(`[PUBLISHER] Enfileirando ingresso comum ${payload.ticketId} para validação imediata.`);
                }
                await ticketValidationQueue.add('validate-half-price', {
                    ticketId: payload.ticketId,
                    buyerId: payload.buyerId,
                    batchId: payload.batchId,
                    eventId: payload.eventId,
                }, { delay });
            }
            // Atualiza o evento outbox para PROCESSADO
            await database_1.prisma.outboxEvent.update({
                where: { id: event.id },
                data: { status: 'PROCESSED' },
            });
        }
        catch (error) {
            console.error(`[PUBLISHER] Erro ao processar evento outbox ${event.id}:`, error);
        }
    }
}
//# sourceMappingURL=outbox-publisher.js.map