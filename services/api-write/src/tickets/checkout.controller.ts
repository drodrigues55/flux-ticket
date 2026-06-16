import { Controller, Post, Get, Param, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { prisma } from '@flux/database';
import { CheckoutService } from './checkout.service';
import { StaffGuard } from './staff-guard';


@Controller()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}
  
  /**
   * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
   */
  @Post('events/:id/staff-mutation')
  @UseGuards(StaffGuard)
  async staffMutation(
    @Param('id') eventId: string,
    @Body() body: { ticketIds: string[]; checkInTimestamp?: string; deviceId?: string; deviceName?: string; pendingCount?: number }
  ) {
    const { ticketIds, deviceId, deviceName, pendingCount } = body;
    
    if (deviceId && deviceName) {
      await this.checkoutService.fluxEngine.registerStaffDevice(eventId, deviceId, deviceName, pendingCount || 0);
    }
    
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return {
        success: true,
        count: 0,
      };
    }
    
    // Executa a mutação em massa no Postgres
    const result = await prisma.ticket.updateMany({
      where: {
        id: { in: ticketIds },
        batch: { eventId: eventId },
      },
      data: {
        status: 'CONSUMED',
      },
    });
    
    console.log(`[MUTATION] ${result.count} ingressos marcados como CONSUMED offline para o evento ${eventId}.`);
    
    return {
      success: true,
      count: result.count,
    };
  }

  @Post('settings/throttle')
  async setThrottle(@Body() body: { limit: number }) {
    if (body.limit === undefined || body.limit < 0) {
      throw new BadRequestException('limit deve ser maior ou igual a 0.');
    }
    await this.checkoutService.fluxEngine.setCheckoutLimit(body.limit);
    return { success: true, limit: body.limit };
  }

  @Post('settings/pause')
  async setPause(@Body() body: { paused: boolean }) {
    if (body.paused === undefined) {
      throw new BadRequestException('paused é obrigatório.');
    }
    await this.checkoutService.fluxEngine.setSalesPaused(body.paused);
    return { success: true, paused: body.paused };
  }

  @Post('events/:id/scan-fail')
  async scanFail(
    @Param('id') eventId: string,
    @Body() body: { count?: number }
  ) {
    const increment = body.count || 1;
    let finalCount = 0;
    for (let i = 0; i < increment; i++) {
      finalCount = await this.checkoutService.fluxEngine.incrementDeniedAttempts(eventId);
    }
    return { success: true, deniedAttempts: finalCount };
  }


  /**
   * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reserva.
   */
  @Post('tickets/renew-lock')
  async renewLock(
    @Body() body: { userId: string; ticketId: string; batchId: string }
  ) {
    const { userId, ticketId, batchId } = body;
    
    if (!userId || !ticketId || !batchId) {
      throw new BadRequestException('userId, ticketId e batchId são obrigatórios.');
    }
    
    try {
      const ticketIds = ticketId.split(',');
      let allSuccess = true;
      for (const tId of ticketIds) {
        const success = await this.checkoutService.renewTicketLock(userId, tId, batchId);
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
  async reserve(
    @Body() body: { eventId: string; batchId: string; price: number; isHalfPrice?: boolean; quantity?: number }
  ) {
    const { eventId, batchId, price, isHalfPrice = false, quantity = 1 } = body;
    
    if (!eventId || !batchId || price === undefined) {
      throw new BadRequestException('eventId, batchId e price são obrigatórios.');
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
    
    // 2. Chamar o checkout do CheckoutService em loop para criar a quantidade de reservas solicitadas
    const ticketIds: string[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        const ticket = await this.checkoutService.checkout({
          userId: user.id,
          eventId,
          batchId,
          buyerCpf: '000.000.000-00', // Placeholder temporário a ser atualizado no pagamento
          price,
          isHalfPrice,
        });
        ticketIds.push(ticket.id);
      }
    } catch (error) {
      // Compensação imediata em caso de falha de estoque ou outra falha no loop
      for (const tId of ticketIds) {
        try {
          await this.checkoutService.fluxEngine.releaseTicketLock(batchId, user.id, tId);
          await prisma.ticketBatch.update({
            where: { id: batchId },
            data: { availableQuantity: { increment: 1 } },
          });
          await prisma.ticket.delete({ where: { id: tId } });
        } catch (cleanupErr) {
          console.error('[CLEANUP ERROR]', cleanupErr);
        }
      }
      throw error;
    }
    
    return {
      ticketId: ticketIds.join(','),
      userId: user.id,
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


