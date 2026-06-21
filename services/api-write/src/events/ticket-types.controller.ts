import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';
import { StaffGuard } from '../tickets/staff-guard';
import { AuditService } from '../audit/audit.service';
import { TicketBatchStatus } from '@prisma/client';

@Controller()
@UseGuards(StaffGuard)
export class TicketTypesController {
  constructor(
    private readonly ticketTypesService: TicketTypesService,
    private readonly auditService: AuditService
  ) {}

  // --- Ticket Types ---

  @Post('events/:eventId/ticket-types')
  async createTicketType(
    @Param('eventId') eventId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    if (!body.name || !body.capacity) throw new BadRequestException('Name and capacity are required');
    const type = await this.ticketTypesService.createTicketType(eventId, body);
    await this.auditService.record({ actorId: req.user.userId, action: 'TICKET_TYPE_CREATED', entityType: 'TicketType', entityId: type.id });
    return type;
  }

  @Get('events/:eventId/ticket-types')
  async getTicketTypes(@Param('eventId') eventId: string) {
    return this.ticketTypesService.getTicketTypes(eventId);
  }

  @Put('events/:eventId/ticket-types/:typeId')
  async updateTicketType(
    @Param('typeId') typeId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const type = await this.ticketTypesService.updateTicketType(typeId, body);
    await this.auditService.record({ actorId: req.user.userId, action: 'TICKET_TYPE_UPDATED', entityType: 'TicketType', entityId: type.id });
    return type;
  }

  @Delete('events/:eventId/ticket-types/:typeId')
  async deleteTicketType(@Param('typeId') typeId: string, @Req() req: any) {
    const result = await this.ticketTypesService.deleteTicketType(typeId);
    await this.auditService.record({ actorId: req.user.userId, action: 'TICKET_TYPE_DELETED', entityType: 'TicketType', entityId: typeId });
    return result;
  }

  // --- Ticket Batches ---

  @Post('ticket-types/:ticketTypeId/batches')
  async createBatch(
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    if (!body.name || body.price === undefined || body.totalQuantity === undefined) {
      throw new BadRequestException('Name, price, and totalQuantity are required');
    }
    const batch = await this.ticketTypesService.createBatch(ticketTypeId, body);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_CREATED', entityType: 'TicketBatch', entityId: batch.id });
    return batch;
  }

  @Put('batches/:batchId')
  async updateBatch(
    @Param('batchId') batchId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const batch = await this.ticketTypesService.updateBatch(batchId, body);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_UPDATED', entityType: 'TicketBatch', entityId: batch.id });
    return batch;
  }

  @Delete('batches/:batchId')
  async deleteBatch(@Param('batchId') batchId: string, @Req() req: any) {
    const result = await this.ticketTypesService.deleteBatch(batchId);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_DELETED', entityType: 'TicketBatch', entityId: batchId });
    return result;
  }

  // --- Active Batch Resolution ---

  @Get('ticket-types/:ticketTypeId/active-batch')
  async getActiveBatch(@Param('ticketTypeId') ticketTypeId: string) {
    return this.ticketTypesService.getActiveBatch(ticketTypeId);
  }

  // --- Manual Batch Actions ---

  @Post('batches/:batchId/pause')
  async pauseBatch(@Param('batchId') batchId: string, @Req() req: any) {
    const batch = await this.ticketTypesService.updateBatchStatus(batchId, TicketBatchStatus.PAUSED);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_PAUSED', entityType: 'TicketBatch', entityId: batch.id });
    return batch;
  }

  @Post('batches/:batchId/resume')
  async resumeBatch(@Param('batchId') batchId: string, @Req() req: any) {
    const batch = await this.ticketTypesService.updateBatchStatus(batchId, TicketBatchStatus.ACTIVE);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_RESUMED', entityType: 'TicketBatch', entityId: batch.id });
    return batch;
  }

  @Post('batches/:batchId/close')
  async closeBatch(@Param('batchId') batchId: string, @Req() req: any) {
    const batch = await this.ticketTypesService.updateBatchStatus(batchId, TicketBatchStatus.COMPLETED);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_CLOSED', entityType: 'TicketBatch', entityId: batch.id });
    return batch;
  }

  @Post('batches/:batchId/activate-next')
  async activateNextBatch(@Param('batchId') batchId: string, @Req() req: any) {
    // In a full implementation, this triggers the ProgressionService
    // For now, simply setting this to completed and we'll implement progression next
    const batch = await this.ticketTypesService.updateBatchStatus(batchId, TicketBatchStatus.COMPLETED);
    await this.auditService.record({ actorId: req.user.userId, action: 'BATCH_MANUAL_NEXT', entityType: 'TicketBatch', entityId: batch.id });
    return batch;
  }
}
