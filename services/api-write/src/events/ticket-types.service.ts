import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from '../tickets/flux-engine.service';
import { EventStatus, TicketBatchStatus, BatchProgressionRule } from '@prisma/client';
import { MinimalTicketTypeInput, MinimalTicketTypeInputSchema } from '@flux/types';
import { validateTicketConfiguration } from './event-creation-validation';

@Injectable()
export class TicketTypesService {
  private readonly logger = new Logger(TicketTypesService.name);

  constructor(private readonly fluxEngine: FluxEngineService) {}

  private parseMinimalTicketInput(data: unknown): MinimalTicketTypeInput {
    const parsed = MinimalTicketTypeInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'TICKET_TYPE_VALIDATION_ERROR',
        message: 'Invalid ticket type input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private validateMinimalTicketDates(input: MinimalTicketTypeInput, event: { date: Date; endDate: Date | null }) {
    validateTicketConfiguration(input, event);
  }

  async upsertMinimalTicketType(eventId: string, organizerId: string, data: unknown, ticketTypeId?: string) {
    const input = this.parseMinimalTicketInput(data);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: { where: { archivedAt: null }, include: { batches: { where: { archivedAt: null }, orderBy: { displayOrder: 'asc' } } } } },
    });
    if (!event || event.organizerId !== organizerId) throw new NotFoundException('Event not found');
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.READY_FOR_VALIDATION) {
      throw new BadRequestException({
        code: 'EVENT_STATUS_LOCKED',
        message: 'Only draft or ready-for-validation events can be edited in Phase 3.',
        details: { status: event.status },
      });
    }

    this.validateMinimalTicketDates(input, event);

    const existingTicketType = ticketTypeId
      ? event.ticketTypes.find((type) => type.id === ticketTypeId)
      : event.ticketTypes[0];

    if (ticketTypeId && !existingTicketType) throw new NotFoundException('TicketType not found');

    const ticketType = existingTicketType
      ? await prisma.ticketType.update({
          where: { id: existingTicketType.id },
          data: {
            name: input.name,
            description: input.description,
            capacity: input.quantity,
            visibility: true,
            transferable: true,
            refundable: true,
            purchaseLimit: 5,
            isActive: true,
          },
        })
      : await prisma.ticketType.create({
          data: {
            eventId,
            name: input.name,
            description: input.description,
            capacity: input.quantity,
            visibility: true,
            transferable: true,
            refundable: true,
            purchaseLimit: 5,
            isActive: true,
          },
        });

    const existingBatch = existingTicketType?.batches[0] ?? null;
    const batchData = {
      eventId,
      ticketTypeId: ticketType.id,
      name: `${input.name} - Default`,
      price: input.basePrice,
      totalQuantity: input.quantity,
      availableQuantity: input.quantity,
      salesStart: input.salesStart ? new Date(input.salesStart) : null,
      salesEnd: input.salesEnd ? new Date(input.salesEnd) : null,
      purchaseLimit: 5,
      progressionRule: BatchProgressionRule.MANUAL,
      displayOrder: 0,
      status: TicketBatchStatus.ACTIVE,
      isActive: true,
    };

    const batch = existingBatch
      ? await prisma.ticketBatch.update({
          where: { id: existingBatch.id },
          data: batchData,
        })
      : await prisma.ticketBatch.create({ data: batchData });

    try {
      await this.fluxEngine.setBatchStock(batch.id, input.quantity);
    } catch (error) {
      if (!existingBatch) await prisma.ticketBatch.delete({ where: { id: batch.id } });
      if (!existingTicketType) await prisma.ticketType.delete({ where: { id: ticketType.id } });
      throw new InternalServerErrorException('Failed to initialize stock in Redis');
    }

    return { ticketType, batch };
  }

  async createTicketType(eventId: string, data: any) {
    return prisma.ticketType.create({
      data: {
        eventId,
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        visibility: data.visibility ?? true,
        transferable: data.transferable ?? true,
        refundable: data.refundable ?? true,
        purchaseLimit: data.purchaseLimit ?? 5,
        isActive: true,
      }
    });
  }

  async getTicketTypes(eventId: string) {
    return prisma.ticketType.findMany({
      where: { eventId, archivedAt: null },
      include: { batches: { where: { archivedAt: null }, orderBy: { displayOrder: 'asc' } } }
    });
  }

  async updateTicketType(id: string, data: any) {
    return prisma.ticketType.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        visibility: data.visibility,
        transferable: data.transferable,
        refundable: data.refundable,
        purchaseLimit: data.purchaseLimit,
      }
    });
  }

  async deleteTicketType(id: string) {
    // Soft delete if batches exist with reservations/tickets
    const type = await prisma.ticketType.findUnique({
      where: { id },
      include: { batches: { include: { _count: { select: { tickets: true, reservationItems: true } } } } }
    });
    if (!type) throw new NotFoundException('TicketType not found');

    const hasSales = type.batches.some(b => b._count.tickets > 0 || b._count.reservationItems > 0);
    if (hasSales) {
      return prisma.ticketType.update({
        where: { id },
        data: { archivedAt: new Date() }
      });
    }

    return prisma.ticketType.delete({ where: { id } });
  }

  async createBatch(ticketTypeId: string, data: any) {
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) throw new NotFoundException('TicketType not found');

    const batch = await prisma.ticketBatch.create({
      data: {
        eventId: ticketType.eventId, // denormalized for backward compatibility
        ticketTypeId,
        name: data.name,
        price: data.price,
        totalQuantity: data.totalQuantity,
        availableQuantity: data.totalQuantity,
        salesStart: data.salesStart ? new Date(data.salesStart) : null,
        salesEnd: data.salesEnd ? new Date(data.salesEnd) : null,
        purchaseLimit: data.purchaseLimit,
        progressionRule: data.progressionRule || BatchProgressionRule.QUANTITY_OR_DATE,
        displayOrder: data.displayOrder || 0,
        status: data.status || TicketBatchStatus.PENDING,
      }
    });

    try {
      await this.fluxEngine.setBatchStock(batch.id, data.totalQuantity);
    } catch (error) {
      await prisma.ticketBatch.delete({ where: { id: batch.id } });
      throw new InternalServerErrorException('Failed to initialize stock in Redis');
    }
    return batch;
  }

  async updateBatch(id: string, data: any) {
    const batch = await prisma.ticketBatch.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true, reservationItems: true } } }
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const hasSales = batch._count.tickets > 0 || batch._count.reservationItems > 0;
    
    // Immutability checks
    if (hasSales && data.price !== undefined && Number(data.price) !== Number(batch.price)) {
      throw new BadRequestException('Cannot change price of a batch with sales history');
    }
    if (hasSales && data.totalQuantity !== undefined && data.totalQuantity < batch.totalQuantity) {
      throw new BadRequestException('Cannot reduce total quantity of a batch with sales history');
    }

    const newTotal = data.totalQuantity !== undefined ? data.totalQuantity : batch.totalQuantity;
    const diff = newTotal - batch.totalQuantity;

    const updated = await prisma.ticketBatch.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        totalQuantity: data.totalQuantity,
        availableQuantity: batch.availableQuantity + diff,
        salesStart: data.salesStart ? new Date(data.salesStart) : undefined,
        salesEnd: data.salesEnd ? new Date(data.salesEnd) : undefined,
        purchaseLimit: data.purchaseLimit,
        progressionRule: data.progressionRule,
        displayOrder: data.displayOrder,
      }
    });

    if (diff !== 0) {
      try {
        await this.fluxEngine.setBatchStock(id, updated.totalQuantity); // For simplistic sake, reset or increment. In actual implementation, should use increment
      } catch (err) {
        this.logger.error('Failed to sync stock updates to redis', err);
      }
    }

    return updated;
  }

  async deleteBatch(id: string) {
    const batch = await prisma.ticketBatch.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true, reservationItems: true } } }
    });
    if (!batch) throw new NotFoundException('Batch not found');

    if (batch._count.tickets > 0 || batch._count.reservationItems > 0) {
      return prisma.ticketBatch.update({ where: { id }, data: { archivedAt: new Date() } });
    }
    return prisma.ticketBatch.delete({ where: { id } });
  }

  async getActiveBatch(ticketTypeId: string) {
    const batch = await prisma.ticketBatch.findFirst({
      where: { ticketTypeId, status: TicketBatchStatus.ACTIVE, archivedAt: null },
      orderBy: { displayOrder: 'asc' }
    });
    if (!batch) throw new NotFoundException('No active batch found for this ticket type');
    return batch;
  }

  // Manual Overrides
  async updateBatchStatus(id: string, status: TicketBatchStatus) {
    const batch = await prisma.ticketBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
    return prisma.ticketBatch.update({ where: { id }, data: { status } });
  }
}
