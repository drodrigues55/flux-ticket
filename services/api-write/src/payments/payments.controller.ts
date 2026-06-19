import { Controller, Post, Body, Headers, Req, Query, BadRequestException, UnauthorizedException, HttpCode } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CheckoutPaymentSchema } from './payments.dto';
import { InvalidCpfException } from '../domain-exceptions';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
