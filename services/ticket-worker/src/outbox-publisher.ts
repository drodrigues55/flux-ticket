import { prisma } from '@flux/database';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const ticketValidationQueue = new Queue('TicketValidationQueue', { connection: connection as any });

/**
 * Busca eventos 'PENDING' na tabela OutboxEvent, enfileira-os no BullMQ e marca como 'PROCESSED'.
 */
export async function processOutbox() {
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    take: 100,
    orderBy: { createdAt: 'asc' },
  });

  if (events.length > 0) {
    console.log(`[PUBLISHER] Encontrados ${events.length} eventos pendentes no Outbox.`);
  }

  for (const event of events) {
    try {
      const payload = event.payload as any;

      if (event.aggregateType === 'TICKET_RESERVED') {
        // Se for meia-entrada, aplica o SLA de 24 horas (atraso no job)
        // Para testes práticos, permitimos configurar um delay menor (ex: via env)
        const delay = payload.isHalfPrice 
          ? (process.env.VALIDATION_DELAY_MS ? Number(process.env.VALIDATION_DELAY_MS) : 24 * 60 * 60 * 1000)
          : 0;

        if (payload.isHalfPrice) {
          console.log(`[PUBLISHER] Enfileirando meia-entrada do ingresso ${payload.ticketId} com atraso (SLA) de ${delay}ms.`);
        } else {
          console.log(`[PUBLISHER] Enfileirando ingresso comum ${payload.ticketId} para validação imediata.`);
        }

        await ticketValidationQueue.add(
          'validate-half-price',
          {
            ticketId: payload.ticketId,
            buyerId: payload.buyerId,
            batchId: payload.batchId,
            eventId: payload.eventId,
          },
          { delay }
        );
      }

      // Atualiza o evento outbox para PROCESSADO
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED' },
      });
    } catch (error) {
      console.error(`[PUBLISHER] Erro ao processar evento outbox ${event.id}:`, error);
    }
  }
}
