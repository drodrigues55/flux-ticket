import { Module } from '@nestjs/common';
import { FluxEngineService } from './flux-engine.service';
import { CheckoutService } from './checkout.service';
import { TicketCryptoService } from './ticket-crypto.service';
import { CheckoutController } from './checkout.controller';

@Module({
  controllers: [CheckoutController],
  providers: [FluxEngineService, CheckoutService, TicketCryptoService],
  exports: [FluxEngineService, CheckoutService, TicketCryptoService],
})
export class FluxEngineModule {}
