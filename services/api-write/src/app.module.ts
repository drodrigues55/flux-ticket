import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { FluxEngineModule } from './tickets/flux-engine.module';
import { EventsModule } from './events/events.module';
import { PaymentsModule } from './payments/payments.module';
import { AuditModule } from './audit/audit.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { HealthModule } from './health/health.module';
import { OrgWriteModule } from './org/org-write.module';

import { RedisThrottlerStorage } from './redis-throttler-storage';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: Number(process.env.RATE_LIMIT_DEFAULT) || 120,
          },
          {
            name: 'checkout',
            ttl: 60000,
            limit: Number(process.env.RATE_LIMIT_CHECKOUT) || 15,
          },
          {
            name: 'reserve',
            ttl: 60000,
            limit: Number(process.env.RATE_LIMIT_RESERVE) || 30,
          },
          {
            name: 'sync',
            ttl: 60000,
            limit: Number(process.env.RATE_LIMIT_SYNC) || 45,
          },
          {
            name: 'webhooks',
            ttl: 60000,
            limit: Number(process.env.RATE_LIMIT_WEBHOOKS) || 300,
          }
        ],
        storage: new RedisThrottlerStorage(),
      }),
    }),
    FluxEngineModule,
    EventsModule,
    PaymentsModule,
    AuditModule,
    MonitoringModule,
    HealthModule,
    OrgWriteModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ]
})
export class AppModule {}
