import { Controller, Post, Get, Put, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { StaffGuard } from '../tickets/staff-guard';
import { AuditService } from '../audit/audit.service';

@Controller('events')
@UseGuards(StaffGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  async create(
    @Body() body: { title: string; slug?: string; description?: string; date: string; location: string; categoryId?: number },
    @Req() req: any
  ) {
    const { title, date, location } = body;
    if (!title || !date || !location) {
      throw new BadRequestException('Os campos title, date e location são obrigatórios.');
    }

    const organizerId = req.user.userId;
    if (!organizerId) throw new BadRequestException('Identificação do organizador ausente no token.');

    const event = await this.eventsService.createEvent(body, organizerId);
    await this.auditService.record({
      actorId: organizerId,
      actorRole: req.user.role,
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return event;
  }

  @Get()
  async findAll(@Req() req: any) {
    const organizerId = req.user.userId;
    if (!organizerId) throw new BadRequestException('Identificação do organizador ausente no token.');
    return this.eventsService.findAllEvents(organizerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.getEvent(id, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; slug?: string; description?: string; date?: string; location?: string; venue?: string; categoryId?: number; capacityTarget?: number },
    @Req() req: any
  ) {
    const organizerId = req.user.userId;
    const event = await this.eventsService.updateEvent(id, organizerId, body);
    await this.auditService.record({
      actorId: organizerId,
      actorRole: req.user.role,
      action: 'EVENT_UPDATED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return event;
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @Req() req: any) {
    const organizerId = req.user.userId;
    const event = await this.eventsService.publishEvent(id, organizerId);
    await this.auditService.record({
      actorId: organizerId,
      actorRole: req.user.role,
      action: 'EVENT_PUBLISHED',
      entityType: 'Event',
      entityId: event.id,
      after: event,
    });
    return event;
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @Req() req: any) {
    const event = await this.eventsService.archiveEvent(id, req.user.userId);
    await this.auditService.record({ actorId: req.user.userId, action: 'EVENT_ARCHIVED', entityType: 'Event', entityId: id });
    return event;
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const event = await this.eventsService.cancelEvent(id, req.user.userId);
    await this.auditService.record({ actorId: req.user.userId, action: 'EVENT_CANCELLED', entityType: 'Event', entityId: id });
    return event;
  }
}
