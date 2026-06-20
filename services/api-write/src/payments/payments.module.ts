import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FluxEngineModule } from '../tickets/flux-engine.module';
import { WebhooksController } from './webhooks.controller';
import { PAYMENT_PROVIDER } from './payment-provider.token';
import { MockPaymentProvider } from './mock-payment.provider';

@Module({
  imports: [FluxEngineModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER,
      useClass: MockPaymentProvider,
    },
    {
      provide: 'PaymentProvider',
      useExisting: PAYMENT_PROVIDER,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
