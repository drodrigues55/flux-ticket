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

  @Patch(':eventId/ticket-types/:ticketTypeId/information')
  async updateTicketTypeInformation(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.updateTicketTypeInformation(eventId, ticketTypeId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'TICKET_TYPE_INFORMATION_UPDATED',
      entityType: 'TicketType',
      entityId: ticketTypeId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Patch(':eventId/ticket-types/:ticketTypeId/rules')
  async updateTicketTypeRules(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.updateTicketTypeRules(eventId, ticketTypeId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'TICKET_TYPE_RULES_UPDATED',
      entityType: 'TicketType',
      entityId: ticketTypeId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/duplicate')
  async duplicateTicketType(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.duplicateTicketType(eventId, ticketTypeId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'TICKET_TYPE_DUPLICATED',
      entityType: 'TicketType',
      entityId: result.id,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/archive')
  async archiveTicketType(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.archiveTicketType(eventId, ticketTypeId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'TICKET_TYPE_ARCHIVED',
      entityType: 'TicketType',
      entityId: ticketTypeId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/batches')
  async createTicketBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.createTicketBatch(eventId, ticketTypeId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCH_CREATED',
      entityType: 'TicketBatch',
      entityId: result.id,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Patch(':eventId/ticket-types/:ticketTypeId/batches/:batchId')
  async updateTicketBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Param('batchId') batchId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.updateTicketBatch(eventId, ticketTypeId, batchId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCH_UPDATED',
      entityType: 'TicketBatch',
      entityId: batchId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/batches/:batchId/duplicate')
  async duplicateTicketBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Param('batchId') batchId: string,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.duplicateTicketBatch(eventId, ticketTypeId, batchId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCH_DUPLICATED',
      entityType: 'TicketBatch',
      entityId: result.id,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/batches/reorder')
  async reorderTicketBatches(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.reorderTicketBatches(eventId, ticketTypeId, actorId, body);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCHES_REORDERED',
      entityType: 'TicketType',
      entityId: ticketTypeId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/batches/:batchId/archive')
  async archiveTicketBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Param('batchId') batchId: string,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.archiveTicketBatch(eventId, ticketTypeId, batchId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCH_ARCHIVED',
      entityType: 'TicketBatch',
      entityId: batchId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/batches/:batchId/activate')
  async activateTicketBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Param('batchId') batchId: string,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.activateTicketBatch(eventId, ticketTypeId, batchId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCH_ACTIVATED',
      entityType: 'TicketBatch',
      entityId: batchId,
      after: result,
      requestId: requestId(req),
    });
    return ok(result, requestId(req));
  }

  @Post(':eventId/ticket-types/:ticketTypeId/batches/:batchId/close')
  async closeTicketBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Param('batchId') batchId: string,
    @Req() req: any
  ) {
    const actorId = organizerId(req);
    const result = await this.ticketTypesService.closeTicketBatch(eventId, ticketTypeId, batchId, actorId);
    await this.auditService.record({
      actorId,
      actorRole: req.user.role,
      action: 'BATCH_CLOSED',
      entityType: 'TicketBatch',
      entityId: batchId,
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
