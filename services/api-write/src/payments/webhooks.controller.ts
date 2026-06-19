import { Body, Controller, Headers, HttpCode, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mercado-pago')
  @HttpCode(200)
  async mercadoPago(
    @Headers('x-signature') signatureHeader: string,
    @Req() req: RawBodyRequest<Request>,
    @Query() query: any,
    @Body() body: any
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false };
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
