import { Module } from '@nestjs/common';
import { FluxEngineModule } from './tickets/flux-engine.module';
import { EventsModule } from './events/events.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [FluxEngineModule, EventsModule, PaymentsModule],
})
export class AppModule {}
