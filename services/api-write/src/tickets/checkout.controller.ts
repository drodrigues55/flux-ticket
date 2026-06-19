import { Controller, Post, Get, Param, Body, Query, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { prisma } from '@flux/database';
import { CheckoutService } from './checkout.service';
import { StaffGuard } from './staff-guard';
import { AuditService } from '../audit/audit.service';
import { StockUnavailableException } from '../domain-exceptions';
import { logger } from '../logger';
import { StaffPlatformService } from './staff-platform.service';


@Controller()
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly auditService: AuditService,
    private readonly staffPlatformService: StaffPlatformService
  ) {}
  
  /**
   * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
   */
  @Post('events/:id/staff-mutation')
  @UseGuards(StaffGuard)
  async staffMutation(
    @Param('id') eventId: string,
    @Body() body: { ticketIds: string[]; checkInTimestamp?: string; deviceId?: string; deviceName?: string; pendingCount?: number; allowedSectorIds?: number[] },
    @Req() req: any
  ) {
    return this.staffPlatformService.syncCheckins({
      eventId,
      ticketIds: body.ticketIds,
      checkInTimestamp: body.checkInTimestamp,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      pendingCount: body.pendingCount,
      allowedSectorIds: body.allowedSectorIds,
      request: req,
    });
  }

  @Post('settings/throttle')
  @UseGuards(StaffGuard)
  async setThrottle(@Body() body: { limit: number }, @Req() req: any) {
    if (body.limit === undefined || body.limit < 0) {
      throw new BadRequestException('limit deve ser maior ou igual a 0.');
    }
    const previousLimit = await this.checkoutService.fluxEngine.getCheckoutLimit();
    await this.checkoutService.fluxEngine.setCheckoutLimit(body.limit);
    await this.auditService.record({
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      action: 'SETTINGS_THROTTLE_UPDATED',
      entityType: 'Settings',
      entityId: 'checkout_limit',
      before: { limit: previousLimit },
      after: { limit: body.limit },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true, limit: body.limit };
  }

  @Post('settings/pause')
  @UseGuards(StaffGuard)
  async setPause(@Body() body: { paused: boolean }, @Req() req: any) {
    if (body.paused === undefined) {
      throw new BadRequestException('paused é obrigatório.');
    }
    const previousPaused = await this.checkoutService.fluxEngine.isSalesPaused();
    await this.checkoutService.fluxEngine.setSalesPaused(body.paused);
    await this.auditService.record({
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      action: 'SETTINGS_PAUSE_UPDATED',
      entityType: 'Settings',
      entityId: 'sales_paused',
      before: { paused: previousPaused },
      after: { paused: body.paused },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true, paused: body.paused };
  }

  @Post('events/:id/scan-fail')
  @UseGuards(StaffGuard)
  async scanFail(
    @Param('id') eventId: string,
    @Body() body: { count?: number; deviceId?: string },
    @Req() req: any
  ) {
    const increment = body.count || 1;
    let finalCount = 0;
    for (let i = 0; i < increment; i++) {
      finalCount = await this.checkoutService.fluxEngine.incrementDeniedAttempts(eventId);
    }
    await this.auditService.record({
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      action: 'STAFF_SCAN_FAILED',
      entityType: 'Event',
      entityId: eventId,
      metadata: { increment, deniedAttempts: finalCount, deviceId: body.deviceId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true, deniedAttempts: finalCount };
  }

  @Post('events/:id/batches/:batchId/waitlist')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async joinWaitlist(
    @Param('id') eventId: string,
    @Param('batchId') batchId: string,
    @Body() body: { email: string; name?: string; phone?: string },
    @Req() req: any
  ) {
    if (!body.email) {
      throw new BadRequestException('email é obrigatório.');
    }

    const batch = await prisma.ticketBatch.findFirst({
      where: { id: batchId, eventId },
    });

    if (!batch) {
      throw new BadRequestException('Lote não encontrado.');
    }

    if (batch.availableQuantity > 0) {
      throw new BadRequestException('A lista de espera só está disponível para lote esgotado.');
    }

    let user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name || body.email,
          password: 'waitlist-placeholder',
          role: 'USER',
        },
      });
    }

    const lastEntry = await (prisma as any).waitlistEntry.findFirst({
      where: { batchId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (lastEntry?.position ?? 0) + 1;

    const entry = await (prisma as any).waitlistEntry.create({
      data: {
        eventId,
        batchId,
        buyerId: user.id,
        email: body.email,
        name: body.name ?? null,
        phone: body.phone ?? null,
        status: 'WAITING',
        position,
      },
    });

    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'WAITLIST_JOINED',
        aggregateId: entry.id,
        type: 'notifications.placeholder',
        status: 'PENDING',
        nextRunAt: new Date(),
        requestId: req.requestId ?? null,
        payload: {
          kind: 'waitlist.joined',
          waitlistEntryId: entry.id,
          eventId,
          batchId,
          email: body.email,
          position,
        },
      },
    });

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'WAITLIST_JOINED',
      entityType: 'WaitlistEntry',
      entityId: entry.id,
      after: { status: 'WAITING', position, eventId, batchId },
      requestId: req.requestId,
    });

    return {
      waitlistEntryId: entry.id,
      eventId,
      batchId,
      status: entry.status,
      position,
    };
  }


  /**
   * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reserva.
   */
  @Post('tickets/renew-lock')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async renewLock(
    @Body() body: { reservationId?: string; userId?: string; ticketId?: string; batchId?: string }
  ) {
    const { reservationId, userId, ticketId, batchId } = body;

    if (reservationId) {
      const reservation = await (prisma as any).reservation.findUnique({
        where: { id: reservationId },
        include: { tickets: { select: { id: true, batchId: true, buyerId: true } } },
      });

      if (!reservation) {
        throw new BadRequestException('reservationId inválido.');
      }

      const expiresAt = new Date(Date.now() + 180 * 1000);
      let allSuccess = true;
      for (const ticket of reservation.tickets) {
        const success = await this.checkoutService.renewTicketLock(ticket.buyerId, ticket.id, ticket.batchId);
        if (!success) allSuccess = false;
      }

      await (prisma as any).reservation.update({
        where: { id: reservationId },
        data: { expiresAt },
      });
      await prisma.ticket.updateMany({
        where: { reservationId },
        data: { expiresAt },
      });

      return {
        success: allSuccess,
        reservationId,
        expiresAt: expiresAt.toISOString(),
      };
    }
    
    if (!userId || !ticketId) {
      throw new BadRequestException('userId e ticketId são obrigatórios.');
    }
    
    try {
      const ticketIds = ticketId.split(',');
      let allSuccess = true;
      for (const tId of ticketIds) {
        let activeBatchId = batchId;
        
        // Se batchId não foi fornecido ou temos múltiplos tickets, consultamos no banco
        if (!activeBatchId || ticketIds.length > 1) {
          const ticket = await prisma.ticket.findUnique({
            where: { id: tId },
            select: { batchId: true },
          });
          if (ticket) {
            activeBatchId = ticket.batchId;
          }
        }
        
        if (!activeBatchId) {
          allSuccess = false;
          continue;
        }

        const success = await this.checkoutService.renewTicketLock(userId, tId, activeBatchId);
        if (!success) allSuccess = false;
      }
      return {
        success: allSuccess,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Falha ao estender lock do ingresso.');
    }
  }

  /**
   * Endpoint de Reserva de Ingresso: Chamado na inicialização da página de checkout para garantir a reserva do lote.
   */
  @Post('tickets/reserve')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async reserve(
    @Body() body: { 
      eventId: string; 
      batchId?: string; 
      price?: number; 
      isHalfPrice?: boolean; 
      quantity?: number;
      items?: Array<{ batchId: string; price: number; isHalfPrice?: boolean; quantity: number }>
    },
    @Req() req: any
  ) {
    const { eventId } = body;
    
    if (!eventId) {
      throw new BadRequestException('eventId é obrigatório.');
    }
    
    // Normaliza para uma lista uniforme de itens a serem reservados
    let reservationItems: Array<{ batchId: string; price: number; isHalfPrice: boolean; quantity: number }> = [];
    
    if (body.items && Array.isArray(body.items)) {
      reservationItems = body.items.map(item => ({
        batchId: item.batchId,
        price: Number(item.price),
        isHalfPrice: !!item.isHalfPrice,
        quantity: Number(item.quantity) || 1
      }));
    } else {
      if (!body.batchId || body.price === undefined) {
        throw new BadRequestException('batchId e price são obrigatórios se items não for fornecido.');
      }
      reservationItems = [{
        batchId: body.batchId,
        price: Number(body.price),
        isHalfPrice: !!body.isHalfPrice,
        quantity: Number(body.quantity) || 1
      }];
    }
    
    // 1. Garantir que exista um usuário guest no banco de dados para a reserva
    let user = await prisma.user.findUnique({
      where: { email: 'guest@flux.com' },
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'guest@flux.com',
          password: 'guest-password-hash-123',
          name: 'Guest Buyer',
          role: 'USER',
        },
      });
    }
    
    const ticketIds: string[] = [];
    const reservedBatchTickets: Array<{ batchId: string; ticketId: string }> = [];
    const expiresAt = new Date(Date.now() + 180 * 1000);
    const reservation = await (prisma as any).reservation.create({
      data: {
        eventId,
        buyerId: user.id,
        status: 'ACTIVE',
        expiresAt,
      },
    });
    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'CART_EXPIRE_ABANDONED',
        aggregateId: reservation.id,
        type: 'carts.expireAbandoned',
        status: 'PENDING',
        nextRunAt: expiresAt,
        requestId: req.requestId ?? null,
        payload: {
          reservationId: reservation.id,
          eventId,
          buyerId: user.id,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
    const reservationItemsByBatchId = new Map<string, any>();

    for (const item of reservationItems) {
      const reservationItem = await (prisma as any).reservationItem.create({
        data: {
          reservationId: reservation.id,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.price,
        },
      });
      reservationItemsByBatchId.set(item.batchId, reservationItem);
    }
    
    try {
      for (const item of reservationItems) {
        const reservationItem = reservationItemsByBatchId.get(item.batchId);
        for (let i = 0; i < item.quantity; i++) {
          const ticket = await this.checkoutService.checkout({
            userId: user.id,
            eventId,
            batchId: item.batchId,
            buyerCpf: '000.000.000-00', // Placeholder temporário a ser atualizado no pagamento
            price: item.price,
            isHalfPrice: item.isHalfPrice,
            reservationId: reservation.id,
            reservationItemId: reservationItem?.id,
            requestId: req.requestId,
          });
          ticketIds.push(ticket.id);
          reservedBatchTickets.push({ batchId: item.batchId, ticketId: ticket.id });
          await this.auditService.record({
            actorId: user.id,
            actorRole: user.role,
            action: 'TICKET_RESERVED',
            entityType: 'Ticket',
            entityId: ticket.id,
            after: { status: ticket.status, batchId: item.batchId, eventId, price: item.price },
            metadata: { isHalfPrice: item.isHalfPrice, reservationId: reservation.id, reservationItemId: reservationItem?.id },
            requestId: req.requestId,
          });
        }
      }
    } catch (error) {
      // Compensação imediata em caso de falha de estoque ou outra falha no loop
      for (const item of reservedBatchTickets) {
        try {
          await this.checkoutService.fluxEngine.releaseTicketLock(item.batchId, user.id, item.ticketId);
          await prisma.ticketBatch.update({
            where: { id: item.batchId },
            data: { availableQuantity: { increment: 1 } },
          });
          await prisma.ticket.delete({ where: { id: item.ticketId } });
        } catch (cleanupErr) {
          logger.error({ err: cleanupErr, eventId, batchId: item.batchId, ticketId: item.ticketId }, 'reservation cleanup failed');
        }
      }
      await (prisma as any).reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED' },
      }).catch((cleanupErr: unknown) => {
        logger.error({ err: cleanupErr, eventId, reservationId: reservation.id }, 'reservation cancellation cleanup failed');
      });
      if (error instanceof Error && error.message.toLowerCase().includes('estoque')) {
        throw new StockUnavailableException({ eventId, items: reservationItems });
      }
      throw error;
    }
    
    return {
      ticketId: ticketIds.join(','),
      userId: user.id,
      reservationId: reservation.id,
      expiresAt: expiresAt.toISOString(),
      items: reservationItems.map((item) => ({
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    };
  }

  @Get('telemetry')
  async getTelemetry(
    @Query('eventId') eventId?: string
  ) {
    const startTime = Date.now();

    // 1. Obter configurações
    const checkoutLimit = await this.checkoutService.fluxEngine.getCheckoutLimit();
    const salesPaused = await this.checkoutService.fluxEngine.isSalesPaused();

    // 2. Obter tentativas negadas e dispositivos de staff
    let deniedAttempts = 0;
    let staffDevices: any[] = [];
    if (eventId) {
      deniedAttempts = await this.checkoutService.fluxEngine.getDeniedAttempts(eventId);
      staffDevices = await this.checkoutService.fluxEngine.getStaffDevices(eventId);
    }

    // 3. Obter estatísticas do Cache do Redis
    const cacheStats = await this.checkoutService.fluxEngine.getRedisInfoStats();

    // 4. Obter/atualizar histórico da fila de validação
    const queueSize = await prisma.ticket.count({
      where: {
        status: 'PENDING_VALIDATION',
        buyerCpf: { not: '000.000.000-00' },
      },
    });
    await this.checkoutService.fluxEngine.addQueueSizeMetric(queueSize);

    // 5. Obter históricos
    const latencyHistory = await this.checkoutService.fluxEngine.getLatencyHistory();
    const queueSizeHistory = await this.checkoutService.fluxEngine.getQueueSizeHistory();

    // Registrar latência deste request
    const elapsed = Date.now() - startTime;
    await this.checkoutService.fluxEngine.addLatencyMetric(elapsed === 0 ? 1 : elapsed);

    return {
      checkoutLimit,
      salesPaused,
      deniedAttempts,
      staffDevices,
      cacheStats,
      latencyHistory,
      queueSizeHistory,
    };
  }
}
