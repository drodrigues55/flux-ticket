import { Controller, Post, Get, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
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

  /**
   * Rota para criação de evento.
   * Exige token JWT com role STAFF/ORGANIZER.
   */
  @Post()
  async create(
    @Body() body: { title: string; description?: string; date: string; location: string; categoryId?: number },
    @Req() req: any
  ) {
    const { title, date, location } = body;
    if (!title || !date || !location) {
      throw new BadRequestException('Os campos title, date e location são obrigatórios.');
    }

    const organizerId = req.user.userId;
    if (!organizerId) {
      throw new BadRequestException('Identificação do organizador ausente no token.');
    }

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

  /**
   * Rota para listagem de todos os eventos do organizador.
   * Exige token JWT com role STAFF/ORGANIZER.
   */
  @Get()
  async findAll(@Req() req: any) {
    const organizerId = req.user.userId;
    if (!organizerId) {
      throw new BadRequestException('Identificação do organizador ausente no token.');
    }

    return this.eventsService.findAllEvents(organizerId);
  }

  /**
   * Rota para criação de lote de ingressos de um evento.
   * Exige token JWT com role STAFF/ORGANIZER.
   */
  @Post(':eventId/batches')
  async createBatch(
    @Param('eventId') eventId: string,
    @Body() body: { name: string; price: number; totalQuantity: number; sectorId?: number; sectorName?: string },
    @Req() req: any
  ) {
    const { name, price, totalQuantity, sectorId, sectorName } = body;
    if (!name || price === undefined || totalQuantity === undefined) {
      throw new BadRequestException('Os campos name, price e totalQuantity são obrigatórios.');
    }
    if (price < 0 || totalQuantity < 0) {
      throw new BadRequestException('Preço e quantidade total devem ser maiores ou iguais a zero.');
    }
    const batch = await this.eventsService.createBatch(eventId, { name, price, totalQuantity, sectorId, sectorName });
    await this.auditService.record({
      actorId: req.user?.userId,
      actorRole: req.user?.role,
      action: 'BATCH_CREATED',
      entityType: 'TicketBatch',
      entityId: batch.id,
      after: batch,
      metadata: { eventId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return batch;
  }

  /**
   * Rota para listagem de todos os lotes de um determinado evento.
   * Exige token JWT com role STAFF/ORGANIZER.
   */
  @Get(':eventId/batches')
  async findAllBatches(@Param('eventId') eventId: string) {
    if (!eventId) {
      throw new BadRequestException('O parâmetro eventId é obrigatório.');
    }
    return this.eventsService.findAllBatches(eventId);
  }
}
