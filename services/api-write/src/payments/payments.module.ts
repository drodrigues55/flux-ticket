import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FluxEngineModule } from '../tickets/flux-engine.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [FluxEngineModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
