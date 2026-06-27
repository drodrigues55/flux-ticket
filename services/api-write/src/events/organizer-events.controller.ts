import { Body, Controller, Delete, Param, Patch, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { TicketTypesService } from './ticket-types.service';
import { StaffGuard } from '../tickets/staff-guard';
import { AuditService } from '../audit/audit.service';
import { ok } from '../api-response';

function requestId(req: any) {
  return req.requestId || req.headers?.['x-request-id'] || 'req_unknown';
}

function organizerId(req: any) {
  const id = req.user?.userId;
  if (!id) throw new BadRequestException('Identificação do organizador ausente no token.');
  return id;
}

@Controller('organizer/events')
@UseGuards(StaffGuard)
export class OrganizerEventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly ticketTypesService: TicketTypesService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  async createDraft(@Body() body: unknown, @Req() req: any) {
    const actorId = organizerId(req);
    const event = await this.eventsService.createOrganizerDraft(body, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_DRAFT_CREATED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      requestId: requestId(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return ok(event, requestId(req));
  }

  @Patch(':eventId/general')
  async updateGeneral(@Param('eventId') eventId: string, @Body() body: unknown, @Req() req: any) {
    const actorId = organizerId(req);
    const event = await this.eventsService.updateOrganizerGeneral(eventId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_GENERAL_UPDATED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      requestId: requestId(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return ok(event, requestId(req));
  }

  @Patch(':eventId')
  async updateDraft(@Param('eventId') eventId: string, @Body() body: unknown, @Req() req: any) {
    const actorId = organizerId(req);
    const event = await this.eventsService.updateOrganizerEvent(eventId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_DRAFT_UPDATED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      requestId: requestId(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return ok(event, requestId(req));
  }

  @Post(':eventId/archive')
  async archive(@Param('eventId') eventId: string, @Body() body: unknown, @Req() req: any) {
    const actorId = organizerId(req);
    const event = await this.eventsService.archiveOrganizerEvent(eventId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_ARCHIVED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      requestId: requestId(req),
    });
    return ok(event, requestId(req));
  }

  @Post(':eventId/duplicate')
  async duplicate(@Param('eventId') eventId: string, @Body() body: unknown, @Req() req: any) {
    const actorId = organizerId(req);
    const event = await this.eventsService.duplicateOrganizerEvent(eventId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_DUPLICATED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      requestId: requestId(req),
    });
    return ok(event, requestId(req));
  }

  @Delete(':eventId')
  async deleteEvent(@Param('eventId') eventId: string, @Req() req: any) {
    const actorId = organizerId(req);
    const result = await this.eventsService.deleteOrganizerEvent(eventId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_DELETED',
      entityType: 'Event',
      entityId: eventId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types')
  async createMinimalTicketType(@Param('eventId') eventId: string, @Body() body: unknown, @Req() req: any) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.upsertMinimalTicketType(eventId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_MINIMAL_TICKET_TYPE_SAVED',
      entityType: 'TicketType',
      entityId: result.ticketType.id,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Patch(':eventId/ticket-types/:ticketTypeId')
  async updateMinimalTicketType(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.upsertMinimalTicketType(eventId, actorId, body, ticketTypeId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_MINIMAL_TICKET_TYPE_UPDATED',
      entityType: 'TicketType',
      entityId: result.ticketType.id,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/mark-ready')
  async markReady(@Param('eventId') eventId: string, @Req() req: any) {
    const actorId = organizerId(req);
    const event = await this.eventsService.markReady(eventId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'EVENT_READY_FOR_VALIDATION',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      requestId: requestId(req),
    });
    return ok(event, requestId(req));
  }
}
