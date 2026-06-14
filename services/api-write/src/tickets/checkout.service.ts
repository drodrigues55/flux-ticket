import { Injectable, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from './flux-engine.service';
import { TicketCryptoService } from './ticket-crypto.service';
import * as crypto from 'crypto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly fluxEngine: FluxEngineService,
    private readonly ticketCryptoService: TicketCryptoService
  ) {}

  /**
   * Realiza o checkout de compra de ingresso de forma atômica e consistente.
   */
  async checkout(data: {
    userId: string;
    eventId: string;
    batchId: string;
    buyerCpf: string;
    price: number;
    isHalfPrice: boolean;
  }) {
    const ticketId = crypto.randomUUID();
    const reservationId = `${data.userId}:${ticketId}`;
    
    // 0. Autoreparação: se o estoque não estiver inicializado no Redis (ex: após seed direto no banco), carrega do Postgres
    const isInitialized = await this.fluxEngine.isStockInitialized(data.batchId);
    if (!isInitialized) {
      const batch = await prisma.ticketBatch.findUnique({
        where: { id: data.batchId },
      });
      if (batch) {
        await this.fluxEngine.setBatchStock(data.batchId, batch.availableQuantity);
      }
    }
    
    // 1. Reserva atômica no Redis (Lock temporário de 180 segundos)
    const success = await this.fluxEngine.reserveTickets(data.batchId, data.userId, ticketId, 1);
    
    if (!success) {
      throw new BadRequestException('Ingressos esgotados ou falha ao reservar no Redis.');
    }
    
    // 2. Transação ACID no PostgreSQL via Prisma
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Decrementar estoque do lote no PostgreSQL
        await tx.ticketBatch.update({
          where: { id: data.batchId },
          data: {
            availableQuantity: {
              decrement: 1,
            },
          },
        });

        // Criação do Ticket com status PENDING_VALIDATION
        const ticket = await tx.ticket.create({
          data: {
            id: ticketId,
            buyerId: data.userId,
            batchId: data.batchId,
            buyerCpf: data.buyerCpf,
            price: data.price,
            status: 'PENDING_VALIDATION',
            expiresAt: new Date(Date.now() + 180 * 1000), // Válido por 3 minutos
          },
        });

        // Criação do registro na tabela OutboxEvent para consistência eventual
        const outbox = await tx.outboxEvent.create({
          data: {
            aggregateType: 'TICKET_RESERVED',
            aggregateId: ticketId,
            payload: {
              ticketId: ticket.id,
              buyerId: data.userId,
              batchId: data.batchId,
              buyerCpf: data.buyerCpf,
              price: data.price.toString(),
              isHalfPrice: data.isHalfPrice,
              eventId: data.eventId,
            },
          },
        });

        return { ticket, outbox };
      });

      return result.ticket;
    } catch (error) {
      // Ação de Compensação: Se falhar no banco relacional, devolvemos o estoque do Redis
      await this.fluxEngine.releaseTicketLock(data.batchId, data.userId, ticketId);
      throw error;
    }
  }

  /**
   * Aprova o pagamento de um ingresso, gerando a assinatura HMAC offline.
   */
  async approveTicketPayment(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    
    if (!ticket) {
      throw new BadRequestException('Ingresso não encontrado.');
    }
    
    // Gerar a assinatura HMAC
    const signature = this.ticketCryptoService.generateSignature(
      ticket.id,
      ticket.buyerCpf,
      ticket.batchId
    );
    
    // Atualizar o status para VALID e salvar a assinatura
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'VALID',
        hmacSignature: signature,
      },
    });
  }

  /**
   * Delega a renovação do lock temporário do ingresso no Redis.
   */
  async renewTicketLock(userId: string, ticketId: string, batchId: string): Promise<boolean> {
    return this.fluxEngine.renewTicketLock(userId, ticketId, batchId);
  }
}
