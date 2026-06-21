import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from '../tickets/flux-engine.service';
import { TicketBatchStatus, BatchProgressionRule } from '@prisma/client';

@Injectable()
export class TicketTypesService {
  private readonly logger = new Logger(TicketTypesService.name);

  constructor(private readonly fluxEngine: FluxEngineService) {}

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
