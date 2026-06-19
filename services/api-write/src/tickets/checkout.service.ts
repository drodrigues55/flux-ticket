import { Injectable, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from './flux-engine.service';
import { TicketCryptoService } from './ticket-crypto.service';
import { recordTicketStatusHistory } from './ticket-status-history';
import * as crypto from 'crypto';

@Injectable()
export class CheckoutService {
  constructor(
    public readonly fluxEngine: FluxEngineService,
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
    reservationId?: string;
    reservationItemId?: string;
    requestId?: string;
  }) {
    const ticketId = crypto.randomUUID();
    const reservationId = `${data.userId}:${ticketId}`;

    const batch = await prisma.ticketBatch.findUnique({
      where: { id: data.batchId },
    });

    if (!batch) {
      throw new BadRequestException('Lote não encontrado.');
    }

    // Guarantee the eventId is always consistent with the batch
    const resolvedEventId = batch.eventId || data.eventId;

    // Verifica se as vendas estão suspensas globalmente
    const isPaused = await this.fluxEngine.isSalesPaused();
    if (isPaused) {
      throw new BadRequestException('As vendas estão suspensas globalmente de forma temporária pelo organizador.');
    }

    // Verifica se o limite de conexões de checkout (throttle) foi atingido
    const activeLocks = await prisma.ticket.count({
      where: {
        buyerCpf: '000.000.000-00',
        expiresAt: { gt: new Date() },
      },
    });
    const limit = await this.fluxEngine.getCheckoutLimit();
    if (activeLocks >= limit) {
      throw new BadRequestException('Fila de checkout cheia. Limite de acessos simultâneos atingido. Tente novamente em alguns segundos.');
    }

    if (!batch.isActive) {
      throw new BadRequestException('As vendas para este lote estão pausadas temporariamente.');
    }


    // 0. Autoreparação: se o estoque não estiver inicializado no Redis (ex: após seed direto no banco), carrega do Postgres
    const isInitialized = await this.fluxEngine.isStockInitialized(data.batchId);
    if (!isInitialized) {
      await this.fluxEngine.setBatchStock(data.batchId, batch.availableQuantity);
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

        // Criação do Ticket com status PENDING_VALIDATION.
        // eventId é armazenado diretamente para evitar joins no dashboard.
        const ticket = await tx.ticket.create({
          data: {
            id: ticketId,
            eventId: resolvedEventId,
            buyerId: data.userId,
            reservationId: data.reservationId,
            reservationItemId: data.reservationItemId,
            batchId: data.batchId,
            buyerCpf: data.buyerCpf,
            price: data.price,
            status: 'PENDING_VALIDATION',
            channel: 'ONLINE',
            meiaEntrada: data.isHalfPrice,
            expiresAt: new Date(Date.now() + 180 * 1000), // Válido por 3 minutos
          },
        });

        await (tx as any).ticketStatusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus: null,
            toStatus: 'PENDING_VALIDATION',
            reason: 'RESERVED',
            actorId: data.userId,
            requestId: data.requestId ?? null,
            metadata: {
              reservationId: data.reservationId ?? null,
              reservationItemId: data.reservationItemId ?? null,
              batchId: data.batchId,
              eventId: resolvedEventId,
            },
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
              reservationId: data.reservationId ?? null,
              reservationItemId: data.reservationItemId ?? null,
              requestId: data.requestId ?? null,
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
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'VALID',
        hmacSignature: signature,
      },
    });
    await recordTicketStatusHistory({
      ticketId,
      fromStatus: ticket.status,
      toStatus: 'VALID',
      reason: 'PAYMENT_APPROVED',
      actorId: ticket.buyerId,
    });
    return updated;
  }

  /**
   * Delega a renovação do lock temporário do ingresso no Redis.
   */
  async renewTicketLock(userId: string, ticketId: string, batchId: string): Promise<boolean> {
    return this.fluxEngine.renewTicketLock(userId, ticketId, batchId);
  }
}
