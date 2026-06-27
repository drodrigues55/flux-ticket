import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from '../tickets/flux-engine.service';
import { EventStatus, TicketBatchStatus, BatchProgressionRule } from '@prisma/client';
import {
  MinimalTicketTypeInput,
  MinimalTicketTypeInputSchema,
  UpdateTicketTypeInformationInputSchema,
  UpdateTicketTypeRulesInputSchema,
  CreateTicketBatchInputSchema,
  UpdateTicketBatchInputSchema,
  ReorderTicketBatchesInputSchema,
} from '@flux/types';
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

  private parseUpdateInformationInput(data: unknown) {
    const parsed = UpdateTicketTypeInformationInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'TICKET_TYPE_VALIDATION_ERROR',
        message: 'Invalid ticket type information input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private parseUpdateRulesInput(data: unknown) {
    const parsed = UpdateTicketTypeRulesInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'TICKET_TYPE_VALIDATION_ERROR',
        message: 'Invalid ticket type rules input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private validateMinimalTicketDates(input: MinimalTicketTypeInput, event: { date: Date; endDate: Date | null }) {
    validateTicketConfiguration(input, event);
  }

  private async checkOwnershipAndContainment(eventId: string, ticketTypeId: string, organizerId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Event not found');
    }
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });
    if (!ticketType || ticketType.eventId !== eventId) {
      throw new NotFoundException('Ticket type not found');
    }
    return { event, ticketType };
  }

  async updateTicketTypeInformation(eventId: string, ticketTypeId: string, organizerId: string, data: unknown) {
    const { ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    if (ticketType.archivedAt) {
      throw new BadRequestException('Cannot edit archived ticket type');
    }

    const input = this.parseUpdateInformationInput(data);

    const batches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null },
    });
    const batchIds = batches.map(b => b.id);

    const sold = await prisma.ticket.count({
      where: {
        batchId: { in: batchIds },
        status: { in: ['VALID', 'CONSUMED'] },
      },
    });

    const now = new Date();
    const reservationItems = await prisma.reservationItem.findMany({
      where: {
        batchId: { in: batchIds },
        reservation: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      },
      select: { quantity: true },
    });
    const reserved = reservationItems.reduce((sum, item) => sum + item.quantity, 0);
    const lockedQuantity = sold + reserved;

    if (input.capacity !== undefined && input.capacity < lockedQuantity) {
      throw new BadRequestException({
        code: 'CAPACITY_BELOW_LOCKED',
        message: `Capacity cannot be reduced below locked quantity (${lockedQuantity}).`,
        details: { lockedQuantity, requested: input.capacity },
      });
    }

    if (input.basePrice !== undefined) {
      if (batches.length !== 1) {
        throw new BadRequestException({
          code: 'PRICE_EDIT_REJECTED',
          message: 'Price cannot be updated when multiple batches exist.',
        });
      }
      if (sold > 0 || reserved > 0) {
        throw new BadRequestException({
          code: 'PRICE_EDIT_REJECTED',
          message: 'Price cannot be updated when there are active sales or reservations.',
        });
      }
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.visibility !== undefined) updateData.visibility = input.visibility;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updated = await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: updateData,
    });

    if (batches.length === 1) {
      const defaultBatch = batches[0];
      const batchUpdate: any = {};
      if (input.basePrice !== undefined) batchUpdate.price = input.basePrice;
      if (input.capacity !== undefined) {
        batchUpdate.totalQuantity = input.capacity;
        const newAvailable = Math.max(0, input.capacity - sold);
        batchUpdate.availableQuantity = newAvailable;
        await this.fluxEngine.setBatchStock(defaultBatch.id, newAvailable);
      }
      if (Object.keys(batchUpdate).length > 0) {
        await prisma.ticketBatch.update({
          where: { id: defaultBatch.id },
          data: batchUpdate,
        });
      }
    }

    return updated;
  }

  async updateTicketTypeRules(eventId: string, ticketTypeId: string, organizerId: string, data: unknown) {
    const { ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    if (ticketType.archivedAt) {
      throw new BadRequestException('Cannot edit archived ticket type');
    }

    const input = this.parseUpdateRulesInput(data);

    return prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        purchaseLimit: input.purchaseLimit,
        refundable: input.refundable,
        transferable: input.transferable,
        visibility: input.visibility,
      },
    });
  }

  async duplicateTicketType(eventId: string, ticketTypeId: string, organizerId: string) {
    const { ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);

    const originalBatches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId: ticketType.id, archivedAt: null },
      orderBy: { displayOrder: 'asc' },
    });

    const newTicketType = await prisma.ticketType.create({
      data: {
        eventId: ticketType.eventId,
        name: `${ticketType.name} Copy`,
        description: ticketType.description,
        capacity: ticketType.capacity,
        visibility: false,
        isActive: false,
        transferable: ticketType.transferable,
        refundable: ticketType.refundable,
        purchaseLimit: ticketType.purchaseLimit,
        archivedAt: null,
      },
    });

    for (const batch of originalBatches) {
      const newBatch = await prisma.ticketBatch.create({
        data: {
          eventId: batch.eventId,
          ticketTypeId: newTicketType.id,
          name: batch.name,
          price: batch.price,
          totalQuantity: batch.totalQuantity,
          availableQuantity: batch.totalQuantity,
          sectorId: batch.sectorId,
          sectorName: batch.sectorName,
          meiaEntrada: batch.meiaEntrada,
          isActive: batch.isActive,
          salesStart: batch.salesStart,
          salesEnd: batch.salesEnd,
          purchaseLimit: batch.purchaseLimit,
          status: batch.status,
          progressionRule: batch.progressionRule,
          displayOrder: batch.displayOrder,
          archivedAt: null,
        },
      });
      await this.fluxEngine.setBatchStock(newBatch.id, batch.totalQuantity);
    }

    return newTicketType;
  }

  async archiveTicketType(eventId: string, ticketTypeId: string, organizerId: string) {
    const { ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    if (ticketType.archivedAt) {
      throw new BadRequestException('Ticket type is already archived');
    }

    const updated = await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        archivedAt: new Date(),
        isActive: false,
        visibility: false,
      },
    });

    const batches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null },
    });

    for (const batch of batches) {
      await prisma.ticketBatch.update({
        where: { id: batch.id },
        data: {
          isActive: false,
          availableQuantity: 0,
        },
      });
      await this.fluxEngine.setBatchStock(batch.id, 0);
    }

    return updated;
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

  private parseCreateBatchInput(data: unknown) {
    const parsed = CreateTicketBatchInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BATCH_VALIDATION_ERROR',
        message: 'Invalid batch creation input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private parseUpdateBatchInput(data: unknown) {
    const parsed = UpdateTicketBatchInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BATCH_VALIDATION_ERROR',
        message: 'Invalid batch update input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private parseReorderBatchesInput(data: unknown) {
    const parsed = ReorderTicketBatchesInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BATCH_VALIDATION_ERROR',
        message: 'Invalid batch reordering input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private async checkBatchContainment(eventId: string, ticketTypeId: string, batchId: string, organizerId: string) {
    const { ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    const batch = await prisma.ticketBatch.findUnique({
      where: { id: batchId }
    });
    if (!batch || batch.ticketTypeId !== ticketTypeId || batch.eventId !== eventId) {
      throw new NotFoundException('Batch not found');
    }
    return { ticketType, batch };
  }

  private validateBatchConfig(input: any, ticketType: any, event: any, existingBatches: any[], batchId?: string) {
    if (!input.name) {
      throw new BadRequestException('Batch name is required.');
    }
    if (input.price !== undefined && input.price < 0) {
      throw new BadRequestException('Price must be zero or greater.');
    }
    if (input.totalQuantity !== undefined && input.totalQuantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }
    const start = input.salesStart ? new Date(input.salesStart) : null;
    const end = input.salesEnd ? new Date(input.salesEnd) : null;
    if (start && end && end <= start) {
      throw new BadRequestException('Sales end must be after sales start.');
    }
    if (start && start > new Date(event.date)) {
      throw new BadRequestException('Sales start should not be after event start.');
    }
    if (end && event.endDate && end > new Date(event.endDate)) {
      throw new BadRequestException('Sales end should not be after event end.');
    }

    if (ticketType.capacity !== undefined) {
      const otherBatches = existingBatches.filter(b => b.id !== batchId);
      const otherCapacity = otherBatches.reduce((sum, b) => sum + b.totalQuantity, 0);
      const requestedCapacity = input.totalQuantity !== undefined ? input.totalQuantity : 0;
      if (otherCapacity + requestedCapacity > ticketType.capacity) {
        throw new BadRequestException(`Total batch capacity exceeds ticket type capacity (${ticketType.capacity}).`);
      }
    }
  }

  async createTicketBatch(eventId: string, ticketTypeId: string, organizerId: string, data: unknown) {
    const { event, ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    const input = this.parseCreateBatchInput(data);

    const existingBatches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null }
    });

    this.validateBatchConfig(input, ticketType, event, existingBatches);

    const maxOrder = existingBatches.reduce((max, b) => Math.max(max, b.displayOrder), -1);

    const batch = await prisma.ticketBatch.create({
      data: {
        eventId,
        ticketTypeId,
        name: input.name,
        price: input.price,
        totalQuantity: input.totalQuantity,
        availableQuantity: input.totalQuantity,
        salesStart: input.salesStart ? new Date(input.salesStart) : null,
        salesEnd: input.salesEnd ? new Date(input.salesEnd) : null,
        purchaseLimit: input.purchaseLimit ?? 5,
        displayOrder: maxOrder + 1,
        status: TicketBatchStatus.PENDING,
        isActive: input.visibility ?? false
      }
    });

    try {
      await this.fluxEngine.setBatchStock(batch.id, input.totalQuantity);
    } catch (error) {
      await prisma.ticketBatch.delete({ where: { id: batch.id } });
      throw new InternalServerErrorException('Failed to sync stock to Redis');
    }

    return batch;
  }

  async updateTicketBatch(eventId: string, ticketTypeId: string, batchId: string, organizerId: string, data: unknown) {
    const { event, ticketType } = await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    const { batch } = await this.checkBatchContainment(eventId, ticketTypeId, batchId, organizerId);
    if (batch.archivedAt) {
      throw new BadRequestException('Cannot edit archived batch.');
    }

    const input = this.parseUpdateBatchInput(data);

    const existingBatches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null }
    });

    const merged = {
      name: input.name !== undefined ? input.name : batch.name,
      price: input.price !== undefined ? input.price : Number(batch.price),
      totalQuantity: input.totalQuantity !== undefined ? input.totalQuantity : batch.totalQuantity,
      salesStart: input.salesStart !== undefined ? input.salesStart : batch.salesStart,
      salesEnd: input.salesEnd !== undefined ? input.salesEnd : batch.salesEnd,
    };
    this.validateBatchConfig(merged, ticketType, event, existingBatches, batchId);

    const sold = await prisma.ticket.count({
      where: {
        batchId,
        status: { in: ['VALID', 'CONSUMED'] }
      }
    });

    const now = new Date();
    const reservationItems = await prisma.reservationItem.findMany({
      where: {
        batchId,
        reservation: {
          status: 'ACTIVE',
          expiresAt: { gt: now }
        }
      },
      select: { quantity: true }
    });
    const reserved = reservationItems.reduce((sum, item) => sum + item.quantity, 0);
    const lockedQuantity = sold + reserved;

    const hasSales = sold > 0 || reserved > 0;

    if (input.price !== undefined && Number(input.price) !== Number(batch.price)) {
      if (hasSales) {
        throw new BadRequestException({
          code: 'PRICE_EDIT_REJECTED',
          message: 'Price cannot be updated on a batch with sales or active reservations.'
        });
      }
    }

    if (input.totalQuantity !== undefined && input.totalQuantity !== batch.totalQuantity) {
      if (input.totalQuantity < lockedQuantity) {
        throw new BadRequestException({
          code: 'CAPACITY_BELOW_LOCKED',
          message: `Capacity cannot be reduced below locked quantity (${lockedQuantity}).`,
          details: { lockedQuantity, requested: input.totalQuantity }
        });
      }
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.totalQuantity !== undefined) {
      updateData.totalQuantity = input.totalQuantity;
      updateData.availableQuantity = input.totalQuantity - sold;
    }
    if (input.salesStart !== undefined) updateData.salesStart = input.salesStart ? new Date(input.salesStart) : null;
    if (input.salesEnd !== undefined) updateData.salesEnd = input.salesEnd ? new Date(input.salesEnd) : null;
    if (input.purchaseLimit !== undefined) updateData.purchaseLimit = input.purchaseLimit;
    if (input.visibility !== undefined) updateData.isActive = input.visibility;

    const updated = await prisma.ticketBatch.update({
      where: { id: batchId },
      data: updateData
    });

    if (input.totalQuantity !== undefined) {
      await this.fluxEngine.setBatchStock(batchId, updated.availableQuantity);
    }

    return updated;
  }

  async duplicateTicketBatch(eventId: string, ticketTypeId: string, batchId: string, organizerId: string) {
    const { batch } = await this.checkBatchContainment(eventId, ticketTypeId, batchId, organizerId);

    const existingBatches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null }
    });

    const maxOrder = existingBatches.reduce((max, b) => Math.max(max, b.displayOrder), -1);

    const duplicated = await prisma.ticketBatch.create({
      data: {
        eventId: batch.eventId,
        ticketTypeId: batch.ticketTypeId,
        name: `${batch.name} Copy`,
        price: batch.price,
        totalQuantity: batch.totalQuantity,
        availableQuantity: batch.totalQuantity,
        sectorId: batch.sectorId,
        sectorName: batch.sectorName,
        meiaEntrada: batch.meiaEntrada,
        isActive: false,
        salesStart: batch.salesStart,
        salesEnd: batch.salesEnd,
        purchaseLimit: batch.purchaseLimit,
        status: TicketBatchStatus.PENDING,
        progressionRule: batch.progressionRule,
        displayOrder: maxOrder + 1,
        archivedAt: null
      }
    });

    await this.fluxEngine.setBatchStock(duplicated.id, batch.totalQuantity);
    return duplicated;
  }

  async reorderTicketBatches(eventId: string, ticketTypeId: string, organizerId: string, data: any) {
    await this.checkOwnershipAndContainment(eventId, ticketTypeId, organizerId);
    const input = this.parseReorderBatchesInput(data);

    const batches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null },
      select: { id: true }
    });
    const existingIds = batches.map(b => b.id);

    const inputIds = input.batchIds;
    if (inputIds.length !== existingIds.length) {
      throw new BadRequestException('Incorrect number of batch IDs provided.');
    }

    const uniqueInputIds = Array.from(new Set(inputIds));
    if (uniqueInputIds.length !== inputIds.length) {
      throw new BadRequestException('Duplicate batch IDs provided.');
    }

    const hasForeignIds = inputIds.some(id => !existingIds.includes(id));
    if (hasForeignIds) {
      throw new BadRequestException('One or more batch IDs do not belong to this ticket type.');
    }

    await prisma.$transaction(
      inputIds.map((id, index) =>
        prisma.ticketBatch.update({
          where: { id },
          data: { displayOrder: index }
        })
      )
    );

    return prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null },
      orderBy: { displayOrder: 'asc' }
    });
  }

  async archiveTicketBatch(eventId: string, ticketTypeId: string, batchId: string, organizerId: string) {
    const { batch } = await this.checkBatchContainment(eventId, ticketTypeId, batchId, organizerId);
    if (batch.archivedAt) {
      throw new BadRequestException('Batch is already archived.');
    }

    const updated = await prisma.ticketBatch.update({
      where: { id: batchId },
      data: {
        archivedAt: new Date(),
        isActive: false
      }
    });

    await this.fluxEngine.setBatchStock(batchId, 0);
    return updated;
  }

  async activateTicketBatch(eventId: string, ticketTypeId: string, batchId: string, organizerId: string) {
    const { batch } = await this.checkBatchContainment(eventId, ticketTypeId, batchId, organizerId);
    if (batch.archivedAt) {
      throw new BadRequestException('Cannot activate archived batch.');
    }
    if (batch.availableQuantity <= 0) {
      throw new BadRequestException('Cannot activate batch with zero available inventory.');
    }
    const now = new Date();
    if (batch.salesEnd && batch.salesEnd < now) {
      throw new BadRequestException('Cannot activate batch whose sales window has ended.');
    }

    await prisma.ticketBatch.updateMany({
      where: { ticketTypeId, status: TicketBatchStatus.ACTIVE, archivedAt: null },
      data: { status: TicketBatchStatus.PAUSED, isActive: false }
    });

    const updated = await prisma.ticketBatch.update({
      where: { id: batchId },
      data: {
        status: TicketBatchStatus.ACTIVE,
        isActive: true
      }
    });

    return updated;
  }

  async closeTicketBatch(eventId: string, ticketTypeId: string, batchId: string, organizerId: string) {
    const { batch } = await this.checkBatchContainment(eventId, ticketTypeId, batchId, organizerId);
    if (batch.archivedAt) {
      throw new BadRequestException('Cannot close archived batch.');
    }

    const updated = await prisma.ticketBatch.update({
      where: { id: batchId },
      data: {
        status: TicketBatchStatus.COMPLETED,
        isActive: false
      }
    });

    return updated;
  }
}
