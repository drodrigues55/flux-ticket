import { Controller, Post, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
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
    @Body() body: { ticketIds: string[]; checkInTimestamp?: string }
  ) {
    const { ticketIds } = body;
    
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      throw new BadRequestException('ticketIds deve ser um array não vazio.');
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
      const success = await this.checkoutService.renewTicketLock(userId, ticketId, batchId);
      return {
        success,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Falha ao estender lock do ingresso.');
    }
  }
}
