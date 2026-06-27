import { Controller, Post, Body, Headers, Req, Query, BadRequestException, UnauthorizedException, HttpCode, Param, NotFoundException } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { CheckoutPaymentSchema } from './payments.dto';
import { InvalidCpfException } from '../domain-exceptions';
import { prisma } from '@flux/database';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Throttle({ checkout: { limit: 15, ttl: 60000 } })
  @Post('checkout')
  @HttpCode(200)
  async checkout(@Body() body: any) {
    const parseResult = CheckoutPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      const hasCpfError = parseResult.error.errors.some((e) => e.path.includes('buyerCpf') || e.path.includes('cpf'));
      if (hasCpfError) {
        throw new InvalidCpfException({ errors: parseResult.error.errors });
      }
      throw new BadRequestException(`Erro de validação: ${errorMsg}`);
    }
    return this.paymentsService.processCheckout(parseResult.data);
  }

  @Post('public/orders/:orderId/resend-tickets')
  @HttpCode(200)
  async resendTickets(@Param('orderId') orderId: string, @Req() req: any) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException('Tickets can only be resent for paid orders.');
    }

    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'ORDER_PAID',
        aggregateId: order.id,
        type: 'tickets.delivery',
        status: 'PENDING',
        nextRunAt: new Date(),
        requestId: req.requestId ?? null,
        payload: { orderId: order.id, buyerId: order.buyerId },
      },
    });

    return { success: true };
  }

  @Throttle({ webhooks: { limit: 300, ttl: 60000 } })
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-signature') signatureHeader: string,
    @Req() req: RawBodyRequest<Request>,
    @Query() query: any,
    @Body() body: any
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('O corpo original bruto da requisição está ausente.');
    }

    const result = await this.paymentsService.receiveMercadoPagoWebhook({
      signatureHeader,
      rawBody,
      query,
      body,
      requestId: (req as any).requestId ?? null,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    return { received: true, duplicate: result.duplicate === true };
  }
}
