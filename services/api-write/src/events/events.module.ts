import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { TicketTypesController } from './ticket-types.controller';
import { TicketTypesService } from './ticket-types.service';
import { FluxEngineModule } from '../tickets/flux-engine.module';

@Module({
  imports: [FluxEngineModule],
  controllers: [EventsController, TicketTypesController],
  providers: [EventsService, TicketTypesService],
  exports: [EventsService, TicketTypesService],
})
export class EventsModule {}
