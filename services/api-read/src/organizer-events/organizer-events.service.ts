import { prisma } from '@flux/database';
import {
  OrganizerEventListQuerySchema,
  type EventCreationDraft,
  type EventCreationReview,
  type EventCreationStep,
  type OrganizerEventDetail,
  type OrganizerEventGeneral,
  type OrganizerEventListItem,
  type OrganizerEventListResponse,
  type OrganizerEventOverview,
} from '@flux/types';

const SOLD_STATUSES = ['VALID', 'CONSUMED'];

function toTicketSummary(ticketType: any) {
  if (!ticketType) return null;
  const batch = ticketType.batches?.[0] ?? null;
  return {
    id: ticketType.id,
    name: ticketType.name,
    description: ticketType.description ?? null,
    quantity: ticketType.capacity,
    basePrice: batch ? Number(batch.price) : 0,
    salesStart: batch?.salesStart ? batch.salesStart.toISOString() : null,
    salesEnd: batch?.salesEnd ? batch.salesEnd.toISOString() : null,
    batchId: batch?.id ?? null,
  };
}

function currentStep(event: any): EventCreationStep {
  if (event.status === 'READY_FOR_VALIDATION') return 'PUBLISH_ENTRY';
  if (event.ticketTypes?.length) return 'REVIEW';
  return 'BASIC_INFORMATION';
}

function toDraft(event: any): EventCreationDraft {
  return {
    event: {
      id: event.id,
      name: event.title,
      slug: event.slug ?? null,
      shortDescription: event.shortDescription ?? null,
      description: event.description ?? null,
      categoryId: event.categoryId ?? null,
      startAt: event.date.toISOString(),
      endAt: event.endDate ? event.endDate.toISOString() : null,
      timezone: event.timezone ?? null,
      locationType: event.locationType,
      venueName: event.venue ?? null,
      addressLine1: event.addressLine1 ?? null,
      addressLine2: event.addressLine2 ?? null,
      city: event.city ?? null,
      state: event.state ?? null,
      postalCode: event.postalCode ?? null,
      country: event.country ?? null,
      onlineUrl: event.onlineUrl ?? null,
      bannerImageUrl: event.imageUrl ?? null,
      capacityTarget: event.capacityTarget ?? null,
      status: event.status,
    },
    ticketType: toTicketSummary(event.ticketTypes?.[0]),
    currentStep: currentStep(event),
  };
}

function toGeneral(event: any): OrganizerEventGeneral {
  return {
    ...toDraft(event).event,
    updatedAt: event.updatedAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
  };
}

export function reviewMessages(draft: EventCreationDraft) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const event = draft.event;
  const ticket = draft.ticketType;

  if (!event.name?.trim()) blockers.push('Event name is required.');
  if (!event.slug?.trim()) blockers.push('Unique slug is required.');
  if (!event.startAt) blockers.push('startAt is required.');
  if (!['PHYSICAL', 'ONLINE', 'HYBRID'].includes(event.locationType)) blockers.push('Valid location type is required.');
  if (!ticket) blockers.push('At least one minimal ticket type is required.');
  if (ticket && !ticket.batchId) blockers.push('At least one default ticket configuration is required.');
  if (ticket && ticket.quantity <= 0) blockers.push('Ticket quantity must be greater than zero.');
  if (ticket && ticket.basePrice < 0) blockers.push('Ticket price must be zero or greater.');

  if (!event.bannerImageUrl) warnings.push('Banner image is recommended before publishing.');
  if (!event.categoryId) warnings.push('Category is recommended before publishing.');
  if (!event.description) warnings.push('Full description is recommended before publishing.');
  if (!event.shortDescription) warnings.push('Short description is recommended before publishing.');
  if (event.locationType !== 'ONLINE' && !event.venueName) warnings.push('Venue name is recommended for physical and hybrid events.');
  if (event.locationType !== 'PHYSICAL' && !event.onlineUrl) warnings.push('Online URL is recommended for online and hybrid events.');

  return { blockers, warnings };
}

function nextAction(status: string): OrganizerEventListItem['nextAction'] {
  if (status === 'DRAFT') return 'Continue setup';
  if (status === 'READY_FOR_VALIDATION') return 'Review publishing';
  if (status === 'ARCHIVED') return 'View archive';
  return 'Manage event';
}

function ticketStats(event: any) {
  const batches = event.ticketTypes?.flatMap((type: any) => type.batches ?? []) ?? [];
  const totalCapacity = batches.reduce((sum: number, batch: any) => sum + batch.totalQuantity, 0);
  const totalSold = batches.reduce((sum: number, batch: any) => {
    if (Array.isArray(batch.tickets)) return sum + batch.tickets.filter((ticket: any) => SOLD_STATUSES.includes(ticket.status)).length;
    return sum + Math.max(0, batch.totalQuantity - batch.availableQuantity);
  }, 0);
  const grossRevenue = batches.reduce((sum: number, batch: any) => {
    if (!Array.isArray(batch.tickets)) return sum;
    return sum + batch.tickets
      .filter((ticket: any) => SOLD_STATUSES.includes(ticket.status))
      .reduce((ticketSum: number, ticket: any) => ticketSum + Number(ticket.price ?? batch.price ?? 0), 0);
  }, 0);
  return {
    ticketTypeCount: event.ticketTypes?.length ?? 0,
    totalCapacity,
    totalSold,
    occupancyPct: totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : null,
    grossRevenue,
  };
}

function toListItem(event: any): OrganizerEventListItem {
  const stats = ticketStats(event);
  const ticketSummary = stats.ticketTypeCount
    ? `${stats.ticketTypeCount} type${stats.ticketTypeCount === 1 ? '' : 's'} / ${stats.totalCapacity} capacity`
    : 'No tickets configured';
  return {
    id: event.id,
    name: event.title,
    slug: event.slug ?? null,
    thumbnailUrl: event.imageUrl ?? null,
    status: event.status,
    startAt: event.date.toISOString(),
    locationSummary: event.venue || event.location || event.onlineUrl || 'Location pending',
    ticketSummary,
    occupancyPct: stats.occupancyPct,
    revenue: stats.grossRevenue,
    updatedAt: event.updatedAt.toISOString(),
    nextAction: nextAction(event.status),
  };
}

function includeForSummary() {
  return {
    ticketTypes: {
      where: { archivedAt: null },
      include: { batches: { where: { archivedAt: null }, include: { tickets: true }, orderBy: { displayOrder: 'asc' as const } } },
      orderBy: { createdAt: 'asc' as const },
    },
  };
}

export class OrganizerEventsReadService {
  async listEvents(queryInput: unknown, organizerId?: string): Promise<OrganizerEventListResponse> {
    const query = OrganizerEventListQuerySchema.parse(queryInput ?? {});
    const where: any = {
      ...(organizerId ? { organizerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      ...((query.startFrom || query.startTo) ? {
        date: {
          ...(query.startFrom ? { gte: new Date(query.startFrom) } : {}),
          ...(query.startTo ? { lte: new Date(query.startTo) } : {}),
        },
      } : {}),
    };
    const orderBy = query.sort === 'name'
      ? { title: query.direction }
      : query.sort === 'startAt'
        ? { date: query.direction }
        : { updatedAt: query.direction };
    const skip = (query.page - 1) * query.limit;
    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        include: includeForSummary(),
        orderBy,
        skip,
        take: query.limit,
      }),
    ]);

    return {
      items: events.map(toListItem),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getEditDraft(eventId: string, organizerId?: string): Promise<EventCreationDraft | null> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, ...(organizerId ? { organizerId } : {}) },
      include: {
        ticketTypes: {
          where: { archivedAt: null },
          include: { batches: { where: { archivedAt: null }, orderBy: { displayOrder: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return event ? toDraft(event) : null;
  }

  async getGeneral(eventId: string, organizerId?: string): Promise<OrganizerEventGeneral | null> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, ...(organizerId ? { organizerId } : {}) },
      include: { ticketTypes: { where: { archivedAt: null }, include: { batches: { where: { archivedAt: null }, orderBy: { displayOrder: 'asc' } } } } },
    });
    return event ? toGeneral(event) : null;
  }

  async getReview(eventId: string, organizerId?: string): Promise<EventCreationReview | null> {
    const draft = await this.getEditDraft(eventId, organizerId);
    if (!draft) return null;
    return { ...draft, ...reviewMessages(draft) };
  }

  async getOverview(eventId: string, organizerId?: string): Promise<OrganizerEventOverview | null> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, ...(organizerId ? { organizerId } : {}) },
      include: includeForSummary(),
    });
    if (!event) return null;
    const general = toGeneral(event);
    const messages = reviewMessages({ event: general, ticketType: toTicketSummary(event.ticketTypes?.[0]), currentStep: currentStep(event) });
    return {
      event: general,
      ticketSummary: ticketStats(event),
      warnings: messages.warnings,
      blockers: messages.blockers,
    };
  }

  async getDetail(eventId: string, organizerId?: string): Promise<OrganizerEventDetail | null> {
    const overview = await this.getOverview(eventId, organizerId);
    if (!overview) return null;
    const canDelete = overview.event.status === 'DRAFT' && overview.ticketSummary.totalSold === 0;
    return {
      event: overview.event,
      overview,
      canDelete,
      canArchive: overview.event.status !== 'ARCHIVED' && overview.event.status !== 'CANCELLED',
      canDuplicate: true,
    };
  }
}

export const organizerEventsReadService = new OrganizerEventsReadService();
