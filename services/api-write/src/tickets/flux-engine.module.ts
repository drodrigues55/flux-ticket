import { Module } from '@nestjs/common';
import { FluxEngineService } from './flux-engine.service';
import { CheckoutService } from './checkout.service';
import { TicketCryptoService } from './ticket-crypto.service';
import { CheckoutController } from './checkout.controller';
import { StaffController } from './staff.controller';
import { StaffPlatformService } from './staff-platform.service';

@Module({
  controllers: [CheckoutController, StaffController],
  providers: [FluxEngineService, CheckoutService, TicketCryptoService, StaffPlatformService],
  exports: [FluxEngineService, CheckoutService, TicketCryptoService],
})
export class FluxEngineModule {}
