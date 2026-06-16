import { CheckoutService } from './checkout.service';
export declare class CheckoutController {
    private readonly checkoutService;
    constructor(checkoutService: CheckoutService);
    /**
     * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
     */
    staffMutation(eventId: string, body: {
        ticketIds: string[];
        checkInTimestamp?: string;
        deviceId?: string;
        deviceName?: string;
        pendingCount?: number;
    }): Promise<{
        success: boolean;
        count: number;
    }>;
    setThrottle(body: {
        limit: number;
    }): Promise<{
        success: boolean;
        limit: number;
    }>;
    setPause(body: {
        paused: boolean;
    }): Promise<{
        success: boolean;
        paused: boolean;
    }>;
    scanFail(eventId: string, body: {
        count?: number;
    }): Promise<{
        success: boolean;
        deniedAttempts: number;
    }>;
    /**
     * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reser  @Post('tickets/renew-lock')
    async renewLock(
      @Body() body: { userId: string; ticketId: string; batchId?: string }
    ) {
      const { userId, ticketId, batchId } = body;
      
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
    reserve(body: {
        eventId: string;
        batchId?: string;
        price?: number;
        isHalfPrice?: boolean;
        quantity?: number;
        items?: Array<{
            batchId: string;
            price: number;
            isHalfPrice?: boolean;
            quantity: number;
        }>;
    }): Promise<{
        ticketId: string;
        userId: string;
    }>;
    getTelemetry(eventId?: string): Promise<{
        checkoutLimit: number;
        salesPaused: boolean;
        deniedAttempts: number;
        staffDevices: any[];
        cacheStats: {
            hits: number;
            misses: number;
        };
        latencyHistory: number[];
        queueSizeHistory: number[];
    }>;
}
//# sourceMappingURL=checkout.controller.d.ts.map