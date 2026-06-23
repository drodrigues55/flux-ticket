import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { EventStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

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
