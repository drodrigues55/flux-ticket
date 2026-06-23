import { Controller, Post, Get, Param, Body, Query, BadRequestException, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { prisma } from '@flux/database';
import { CheckoutService } from './checkout.service';
import { StaffGuard } from './staff-guard';
import { AuditService } from '../audit/audit.service';
import { StockUnavailableException } from '../domain-exceptions';
import { logger } from '../logger';
import { StaffPlatformService } from './staff-platform.service';
import { TicketCryptoService } from './ticket-crypto.service';


@Controller()
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly auditService: AuditService,
    private readonly staffPlatformService: StaffPlatformService,
    private readonly ticketCryptoService: TicketCryptoService
  ) {}
  
  /**
   * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
   */
  @Throttle({ sync: { limit: 45, ttl: 60000 } })
  @Post('events/:id/staff-mutation')
  @UseGuards(StaffGuard)
  async staffMutation(
    @Param('id') eventId: string,
    @Body() body: {
      ticketIds?: string[];
      checkins?: any[];
      checkInTimestamp?: string;
      deviceId?: string;
      deviceName?: string;
      pendingCount?: number;
      allowedSectorIds?: number[];
    },
    @Req() req: any
  ) {
    return this.staffPlatformService.syncCheckins({
      eventId,
      ticketIds: body.ticketIds,
      checkins: body.checkins,
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
  @Throttle({ reserve: { limit: 30, ttl: 60000 } })
  @Post('tickets/reserve')
  async reserve(
    @Body() body: { 
      eventId: string; 
      batchId?: string; 
      ticketTypeId?: string;
      price?: number; 
      isHalfPrice?: boolean; 
      quantity?: number;
      items?: Array<{ batchId?: string; ticketTypeId?: string; price?: number; isHalfPrice?: boolean; quantity: number }>
    },
    @Req() req: any
  ) {
    const { eventId } = body;
    
    if (!eventId) {
      throw new BadRequestException('eventId é obrigatório.');
    }
    
    // Normaliza para uma lista uniforme de itens a serem reservados
    let reservationItems: Array<{ batchId?: string; ticketTypeId?: string; price?: number; isHalfPrice: boolean; quantity: number }> = [];
    
    if (body.items && Array.isArray(body.items)) {
      reservationItems = body.items.map(item => ({
        batchId: item.batchId,
        ticketTypeId: item.ticketTypeId,
        price: item.price !== undefined ? Number(item.price) : undefined,
        isHalfPrice: !!item.isHalfPrice,
        quantity: Number(item.quantity) || 1
      }));
    } else {
      if (!body.batchId && !body.ticketTypeId) {
        throw new BadRequestException('batchId ou ticketTypeId é obrigatório se items não for fornecido.');
      }
      reservationItems = [{
        batchId: body.batchId,
        ticketTypeId: body.ticketTypeId,
        price: body.price !== undefined ? Number(body.price) : undefined,
        isHalfPrice: !!body.isHalfPrice,
        quantity: Number(body.quantity) || 1
      }];
    }

    // Resolve active batches for ticket types
    for (const item of reservationItems) {
      if (item.ticketTypeId && !item.batchId) {
        const activeBatch = await prisma.ticketBatch.findFirst({
          where: { ticketTypeId: item.ticketTypeId, status: 'ACTIVE', archivedAt: null },
          orderBy: { displayOrder: 'asc' }
        });
        if (!activeBatch) {
          throw new BadRequestException(`Nenhum lote ativo encontrado para o tipo de ingresso ${item.ticketTypeId}`);
        }
        item.batchId = activeBatch.id;
        if (item.price === undefined) {
          item.price = Number(activeBatch.price);
        }
      }
      if (!item.batchId || item.price === undefined) {
        throw new BadRequestException('Não foi possível resolver o lote ou preço do item.');
      }
    }
    
    const ticketIds: string[] = [];
    const reservedBatchTickets: Array<{ batchId: string; ticketId: string }> = [];
    const expiresAt = new Date(Date.now() + 180 * 1000);

    const { user, reservation, reservationItemsByBatchId } = await prisma.$transaction(async (tx) => {
      const txUser = await tx.user.upsert({
        where: { email: 'guest@flux.com' },
        create: {
          email: 'guest@flux.com',
          password: 'guest-password-hash-123',
          name: 'Guest Buyer',
          role: 'USER',
        },
        update: {},
      });

      const txReservation = await (tx as any).reservation.create({
        data: {
          eventId,
          buyerId: txUser.id,
          status: 'ACTIVE',
          expiresAt,
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'CART_EXPIRE_ABANDONED',
          aggregateId: txReservation.id,
          type: 'carts.expireAbandoned',
          status: 'PENDING',
          nextRunAt: expiresAt,
          requestId: req.requestId ?? null,
          payload: {
            reservationId: txReservation.id,
            eventId,
            buyerId: txUser.id,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      const txReservationItemsByBatchId = new Map<string, any>();
      for (const item of reservationItems) {
        const reservationItem = await (tx as any).reservationItem.create({
          data: {
            reservationId: txReservation.id,
            batchId: item.batchId!,
            quantity: item.quantity,
            unitPrice: item.price!,
          },
        });
        txReservationItemsByBatchId.set(item.batchId!, reservationItem);
      }

      return { user: txUser, reservation: txReservation, reservationItemsByBatchId: txReservationItemsByBatchId };
    });
    
    try {
      for (const item of reservationItems) {
        const reservationItem = reservationItemsByBatchId.get(item.batchId!);
        for (let i = 0; i < item.quantity; i++) {
          const ticket = await this.checkoutService.checkout({
            userId: user.id,
            eventId,
            batchId: item.batchId!,
            buyerCpf: '000.000.000-00', // Placeholder temporário a ser atualizado no pagamento
            price: item.price!,
            isHalfPrice: item.isHalfPrice,
            reservationId: reservation.id,
            reservationItemId: reservationItem?.id,
            requestId: req.requestId,
          });
          ticketIds.push(ticket.id);
          reservedBatchTickets.push({ batchId: item.batchId!, ticketId: ticket.id });
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
      await prisma.$transaction(async (tx) => {
        await (tx as any).reservation.update({
          where: { id: reservation.id },
          data: { status: 'CANCELLED' },
        });
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
    const checkoutLimit = await this.checkoutService.fluxEngine.getCheckoutLimitSafe();
    const salesPaused = await this.checkoutService.fluxEngine.isSalesPausedSafe();

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

  @Post('tickets/:id/validate')
  async validateTicket(
    @Param('id') id: string,
    @Body() body: { signature: string; version?: number },
    @Req() req: any
  ) {
    const version = body.version ?? 1;
    const signature = body.signature;

    if (!signature) {
      throw new BadRequestException('A assinatura do QR Code é obrigatória.');
    }

    // 1. Signature check before database lookup
    const isSignatureValid = this.ticketCryptoService.verifySignature(id, version, signature);
    if (!isSignatureValid) {
      throw new BadRequestException('Assinatura do ingresso inválida ou adulterada.');
    }

    // 2. Database lookup
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado no banco de dados.');
    }

    if (ticket.event.status === 'CANCELLED') {
      throw new BadRequestException('Evento cancelado. O ingresso não é mais válido.');
    }

    if (ticket.status === 'CONSUMED' || ticket.checkedInAt) {
      throw new BadRequestException('Ingresso já consumido. Entrada duplicada recusada.');
    }

    if (ticket.status !== 'VALID') {
      throw new BadRequestException(`Ingresso inválido. Status atual: ${ticket.status}`);
    }

    if (new Date() > ticket.expiresAt) {
      throw new BadRequestException('Ingresso expirado.');
    }

    // 3. Atomically perform check-in
    try {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            status: 'VALID',
            checkedInAt: null,
          },
          data: {
            status: 'CONSUMED',
            checkedInAt: new Date(),
          },
        });

        if (updated.count !== 1) {
          throw new BadRequestException('Ingresso já consumido por outra portaria simultânea.');
        }

        const checkin = await tx.checkin.create({
          data: {
            eventId: ticket.eventId,
            ticketId: ticket.id,
            status: 'ACCEPTED',
            scannedAt: new Date(),
            operatorId: req.user?.userId ?? null,
            requestId: req.requestId ?? null,
          },
        });

        await tx.ticketStatusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus: 'VALID',
            toStatus: 'CONSUMED',
            reason: 'ONLINE_CHECK_IN',
            actorId: req.user?.userId ?? null,
            requestId: req.requestId ?? null,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: req.user?.userId ?? null,
            actorRole: req.user?.role ?? 'SYSTEM',
            action: 'TICKET_CHECKED_IN',
            entityType: 'Ticket',
            entityId: ticket.id,
            before: { status: ticket.status, checkedInAt: ticket.checkedInAt },
            after: { status: 'CONSUMED', checkedInAt: checkin.scannedAt.toISOString() },
            metadata: { eventId: ticket.eventId, checkinId: checkin.id },
            requestId: req.requestId ?? null,
          },
        });

        return checkin;
      });

      return {
        success: true,
        message: 'Acesso liberado! Check-in realizado online com sucesso.',
        ticketId: ticket.id,
        checkinId: result.id,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Erro na transação de check-in.');
    }
  }

  @Get('tickets/:id/wallet/apple')
  async getAppleWalletPass(@Param('id') id: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.');
    }
    const payload = this.ticketCryptoService.generateQrPayload(ticket.id, 1);
    return {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.fluxtickets',
      serialNumber: ticket.id,
      teamIdentifier: 'FLUX123456',
      barcode: {
        message: JSON.stringify(payload),
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
      },
      organizationName: 'Flux Tickets',
      description: 'Flux Tickets Digital Pass',
      logoText: 'Flux Tickets',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(13, 21, 38)',
    };
  }

  @Get('tickets/:id/wallet/google')
  async getGoogleWalletPass(@Param('id') id: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.');
    }
    const payload = this.ticketCryptoService.generateQrPayload(ticket.id, 1);
    return {
      id: `issuer_id.${ticket.id}`,
      classId: `issuer_id.event_${ticket.eventId}`,
      state: 'ACTIVE',
      barcode: {
        type: 'QR_CODE',
        value: JSON.stringify(payload),
      },
      cardTitle: {
        defaultValue: {
          language: 'pt-BR',
          value: 'Flux Tickets',
        },
      },
    };
  }
}
