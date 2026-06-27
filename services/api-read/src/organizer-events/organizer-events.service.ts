import { prisma } from '@flux/database';
import type { EventCreationDraft, EventCreationReview, EventCreationStep } from '@flux/types';

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

export class OrganizerEventsReadService {
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

  async getReview(eventId: string, organizerId?: string): Promise<EventCreationReview | null> {
    const draft = await this.getEditDraft(eventId, organizerId);
    if (!draft) return null;
    return { ...draft, ...reviewMessages(draft) };
  }
}

export const organizerEventsReadService = new OrganizerEventsReadService();
