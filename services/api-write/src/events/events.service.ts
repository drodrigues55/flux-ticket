import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { EventLocationType, EventStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  CreateEventInput,
  CreateEventInputSchema,
  UpdateEventBasicInfoInput,
  UpdateEventBasicInfoInputSchema,
  ArchiveEventInputSchema,
  DuplicateEventInputSchema,
} from '@flux/types';
import { validateEventDateRange } from './event-creation-validation';
import { canDeleteEvent } from './event-management-rules';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  private parseCreateInput(data: unknown): CreateEventInput {
    const parsed = CreateEventInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'EVENT_VALIDATION_ERROR',
        message: 'Invalid event input.',
        details: parsed.error.flatten(),
      });
    }
    this.validateEventDates(parsed.data.startAt, parsed.data.endAt);
    return parsed.data;
  }

  private parseUpdateInput(data: unknown): UpdateEventBasicInfoInput {
    const parsed = UpdateEventBasicInfoInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'EVENT_VALIDATION_ERROR',
        message: 'Invalid event input.',
        details: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }

  private validateEventDates(startAt?: string, endAt?: string) {
    validateEventDateRange(startAt, endAt);
  }

  private toEventData(input: CreateEventInput | UpdateEventBasicInfoInput) {
    return {
      title: input.name,
      slug: input.slug,
      shortDescription: input.shortDescription,
      description: input.description,
      categoryId: input.categoryId,
      date: input.startAt ? new Date(input.startAt) : undefined,
      endDate: input.endAt ? new Date(input.endAt) : undefined,
      timezone: input.timezone,
      locationType: input.locationType as EventLocationType | undefined,
      venue: input.venueName,
      location: this.composeLocation(input),
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      country: input.country,
      onlineUrl: input.onlineUrl,
      imageUrl: input.bannerImageUrl,
      capacityTarget: input.capacityTarget,
    };
  }

  private composeLocation(input: CreateEventInput | UpdateEventBasicInfoInput) {
    const parts = [
      input.venueName,
      input.addressLine1,
      input.addressLine2,
      input.city,
      input.state,
      input.postalCode,
      input.country,
      input.onlineUrl,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }

  private async assertSlugAvailable(organizerId: string, slug: string, exceptEventId?: string) {
    const duplicate = await prisma.event.findFirst({
      where: {
        organizerId,
        slug,
        ...(exceptEventId ? { id: { not: exceptEventId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException({
        code: 'EVENT_SLUG_DUPLICATE',
        message: 'Slug is already used by another event for this organizer.',
        details: { field: 'slug', slug },
      });
    }
  }

  async createOrganizerDraft(data: unknown, organizerId: string) {
    const input = this.parseCreateInput(data);
    await this.assertSlugAvailable(organizerId, input.slug);

    return prisma.event.create({
      data: {
        ...this.toEventData(input),
        title: input.name,
        slug: input.slug,
        date: new Date(input.startAt),
        location: this.composeLocation(input) || 'Online',
        organizerId,
        status: EventStatus.DRAFT,
      },
    });
  }

  async updateOrganizerEvent(id: string, organizerId: string, data: unknown) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Event not found');
    }
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.READY_FOR_VALIDATION) {
      throw new BadRequestException({
        code: 'EVENT_STATUS_LOCKED',
        message: 'Only draft or ready-for-validation events can be edited in Phase 3.',
        details: { status: event.status },
      });
    }

    const input = this.parseUpdateInput(data);
    if (input.slug) {
      await this.assertSlugAvailable(organizerId, input.slug, id);
    }
    if (input.startAt || input.endAt) {
      this.validateEventDates(
        input.startAt ?? event.date.toISOString(),
        input.endAt ?? event.endDate?.toISOString()
      );
    }

    return prisma.event.update({
      where: { id },
      data: this.toEventData(input),
    });
  }

  async markReady(id: string, organizerId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: { where: { archivedAt: null }, include: { batches: { where: { archivedAt: null } } } } },
    });
    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Event not found');
    }
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.READY_FOR_VALIDATION) {
      throw new BadRequestException({
        code: 'EVENT_INVALID_STATUS_TRANSITION',
        message: 'Only DRAFT events can be marked ready for validation.',
        details: { status: event.status },
      });
    }

    const blockers: string[] = [];
    if (!event.title?.trim()) blockers.push('Event name is required.');
    if (!event.slug?.trim()) blockers.push('Unique slug is required.');
    if (!event.date) blockers.push('startAt is required.');
    if (!['PHYSICAL', 'ONLINE', 'HYBRID'].includes(event.locationType)) blockers.push('Valid location type is required.');
    if (event.slug) await this.assertSlugAvailable(organizerId, event.slug, id);

    const ticketType = event.ticketTypes[0];
    const batch = ticketType?.batches[0];
    if (!ticketType) blockers.push('At least one minimal ticket type is required.');
    if (!batch) blockers.push('At least one default ticket configuration is required.');
    if (ticketType && ticketType.capacity <= 0) blockers.push('Ticket quantity must be greater than zero.');
    if (batch && Number(batch.price) < 0) blockers.push('Ticket price must be zero or greater.');

    if (blockers.length > 0) {
      throw new BadRequestException({
        code: 'EVENT_READY_REQUIREMENTS_MISSING',
        message: 'Event is missing required data for validation.',
        details: { blockers },
      });
    }

    if (event.status === EventStatus.READY_FOR_VALIDATION) return event;

    return prisma.event.update({
      where: { id },
      data: { status: EventStatus.READY_FOR_VALIDATION },
    });
  }

  async updateOrganizerGeneral(id: string, organizerId: string, data: unknown) {
    return this.updateOrganizerEvent(id, organizerId, data);
  }

  async archiveOrganizerEvent(id: string, organizerId: string, data: unknown = {}) {
    const parsed = ArchiveEventInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'EVENT_ARCHIVE_VALIDATION_ERROR',
        message: 'Invalid archive input.',
        details: parsed.error.flatten(),
      });
    }
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) throw new NotFoundException('Event not found');
    if (event.status === EventStatus.ARCHIVED) return event;
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'EVENT_ARCHIVE_INVALID_STATUS',
        message: 'Cancelled events cannot be archived.',
        details: { status: event.status },
      });
    }
    return prisma.event.update({ where: { id }, data: { status: EventStatus.ARCHIVED } });
  }

  async duplicateOrganizerEvent(id: string, organizerId: string, data: unknown = {}) {
    const parsed = DuplicateEventInputSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'EVENT_DUPLICATE_VALIDATION_ERROR',
        message: 'Invalid duplicate input.',
        details: parsed.error.flatten(),
      });
    }
    const original = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: { where: { archivedAt: null }, include: { batches: { where: { archivedAt: null }, orderBy: { displayOrder: 'asc' } } } } },
    });
    if (!original || original.organizerId !== organizerId) throw new NotFoundException('Event not found');

    const title = parsed.data.name || `${original.title} Copy`;
    const baseSlug = parsed.data.slug || `${original.slug || original.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-copy`;
    let slug = baseSlug.replace(/^-+|-+$/g, '') || `event-copy-${randomUUID().slice(0, 8)}`;
    for (let index = 0; index < 20; index += 1) {
      const candidate = index === 0 ? slug : `${slug}-${index + 1}`;
      const existing = await prisma.event.findFirst({ where: { organizerId, slug: candidate }, select: { id: true } });
      if (!existing) {
        slug = candidate;
        break;
      }
    }

    return prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          slug,
          title,
          shortDescription: original.shortDescription,
          description: original.description,
          date: original.date,
          endDate: original.endDate,
          timezone: original.timezone,
          locationType: original.locationType,
          location: original.location,
          venue: original.venue,
          addressLine1: original.addressLine1,
          addressLine2: original.addressLine2,
          city: original.city,
          state: original.state,
          postalCode: original.postalCode,
          country: original.country,
          onlineUrl: original.onlineUrl,
          imageUrl: original.imageUrl,
          categoryId: original.categoryId,
          capacityTarget: original.capacityTarget,
          tags: original.tags,
          organizerId,
          status: EventStatus.DRAFT,
        },
      });

      for (const originalType of original.ticketTypes) {
        const ticketType = await tx.ticketType.create({
          data: {
            eventId: event.id,
            name: originalType.name,
            description: originalType.description,
            sectorId: originalType.sectorId,
            sectorName: originalType.sectorName,
            capacity: originalType.capacity,
            visibility: originalType.visibility,
            transferable: originalType.transferable,
            refundable: originalType.refundable,
            purchaseLimit: originalType.purchaseLimit,
            isActive: originalType.isActive,
          },
        });
        for (const originalBatch of originalType.batches) {
          await tx.ticketBatch.create({
            data: {
              eventId: event.id,
              ticketTypeId: ticketType.id,
              name: originalBatch.name,
              price: originalBatch.price,
              totalQuantity: originalBatch.totalQuantity,
              availableQuantity: originalBatch.totalQuantity,
              sectorId: originalBatch.sectorId,
              sectorName: originalBatch.sectorName,
              meiaEntrada: originalBatch.meiaEntrada,
              isActive: originalBatch.isActive,
              salesStart: originalBatch.salesStart,
              salesEnd: originalBatch.salesEnd,
              purchaseLimit: originalBatch.purchaseLimit,
              status: originalBatch.status,
              progressionRule: originalBatch.progressionRule,
              displayOrder: originalBatch.displayOrder,
            },
          });
        }
      }
      return event;
    });
  }

  async deleteOrganizerEvent(id: string, organizerId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true,
            payments: true,
            reservations: true,
            orders: true,
            checkins: true,
            alerts: true,
          },
        },
      },
    });
    if (!event || event.organizerId !== organizerId) throw new NotFoundException('Event not found');
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException({
        code: 'EVENT_DELETE_INVALID_STATUS',
        message: 'Only safe draft events can be deleted.',
        details: { status: event.status },
      });
    }
    if (!canDeleteEvent({ status: event.status, counts: event._count })) {
      throw new BadRequestException({
        code: 'EVENT_DELETE_UNSAFE',
        message: 'Draft event cannot be deleted after transactional or operational records exist.',
        details: event._count,
      });
    }
    await prisma.event.delete({ where: { id } });
    return { id, deleted: true };
  }

  async createEvent(
    data: { title: string; slug?: string; description?: string; date: string; endDate?: string; location: string; categoryId?: number },
    organizerId: string
  ) {
    const slug = data.slug || `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().substring(0, 8)}`;
    return prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        location: data.location,
        categoryId: data.categoryId,
        organizerId: organizerId,
        status: EventStatus.DRAFT,
      },
    });
  }

  async updateEvent(
    id: string,
    organizerId: string,
    data: { title?: string; slug?: string; description?: string; date?: string; endDate?: string; location?: string; venue?: string; categoryId?: number; capacityTarget?: number }
  ) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Event not found');
    }
    return prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        date: data.date ? new Date(data.date) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        location: data.location,
        venue: data.venue,
        categoryId: data.categoryId,
        capacityTarget: data.capacityTarget,
      },
    });
  }

  async findAllEvents(organizerId: string) {
    return prisma.event.findMany({
      where: { organizerId },
      orderBy: { date: 'asc' },
    });
  }

  async getEvent(id: string, organizerId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: { include: { batches: true } } }
    });
    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async publishEvent(id: string, organizerId: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) throw new NotFoundException('Event not found');
    if (event.status !== EventStatus.DRAFT) throw new BadRequestException('Only DRAFT events can be published');

    return prisma.event.update({
      where: { id },
      data: { status: EventStatus.PUBLISHED },
    });
  }

  async archiveEvent(id: string, organizerId: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) throw new NotFoundException('Event not found');
    if (event.status === EventStatus.CANCELLED) throw new BadRequestException('Cannot archive a cancelled event');

    return prisma.event.update({
      where: { id },
      data: { status: EventStatus.ARCHIVED },
    });
  }

  async cancelEvent(id: string, organizerId: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) throw new NotFoundException('Event not found');
    
    // In a real system, we'd also trigger refunds here.
    return prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });
  }
}
