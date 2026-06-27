import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { OrganizerEventsController } from './organizer-events.controller';
import { EventsService } from './events.service';
import { TicketTypesController } from './ticket-types.controller';
import { TicketTypesService } from './ticket-types.service';
import { FluxEngineModule } from '../tickets/flux-engine.module';

@Module({
  imports: [FluxEngineModule],
  controllers: [EventsController, OrganizerEventsController, TicketTypesController],
  providers: [EventsService, TicketTypesService],
  exports: [EventsService, TicketTypesService],
})
export class EventsModule {}
