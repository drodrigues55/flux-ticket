import { Worker, Job } from 'bullmq';
import { prisma } from '@flux/database';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

export const ticketValidationWorker = new Worker(
  'TicketValidationQueue',
  async (job: Job) => {
    const { ticketId, batchId, eventId } = job.data;
    console.log(`[WORKER] Iniciando verificação de SLA do ingresso ${ticketId}...`);

    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        console.log(`[WORKER] Ingresso ${ticketId} não foi encontrado.`);
        return;
      }

      if (ticket.status === 'PENDING_VALIDATION') {
        console.log(`[WORKER] ⚠️ SLA estourado para meia-entrada do ingresso ${ticketId}. Executando estorno e compensação...`);

        // 1. Revoga o ingresso no Postgres
        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: 'REVOKED' },
        });

        // 2. Devolve estoque no banco relacional (Postgres)
        await tx.ticketBatch.update({
          where: { id: batchId },
          data: {
            availableQuantity: {
              increment: 1,
            },
          },
        });

        // 3. Devolve estoque no cache (Redis)
        const availableTicketsKey = `stock:{${batchId}}`;
        await redisClient.incr(availableTicketsKey);

        // 4. Log simulando reembolso do gateway
        console.log(`[WORKER] 💸 [REEMBOLSO] Estorno de pagamento solicitado para o comprador do ingresso ${ticketId}.`);
      } else {
        console.log(`[WORKER] Ingresso ${ticketId} já validado ou tratado (${ticket.status}). Nenhuma ação necessária.`);
      }
    });
  },
  {
    connection: redisClient as any,
  }
);

ticketValidationWorker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job?.id} falhou com o erro:`, err);
});
