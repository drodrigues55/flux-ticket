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

  private async checkEventOwnership(eventId: string, organizerId?: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, ...(organizerId ? { organizerId } : {}) },
    });
    if (!event) throw new Error('Event not found');
    return event;
  }

  async listTicketTypes(eventId: string, organizerId?: string): Promise<any[]> {
    await this.checkEventOwnership(eventId, organizerId);

    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      include: {
        batches: {
          where: { archivedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const results = [];
    for (const tt of ticketTypes) {
      const batchIds = tt.batches.map(b => b.id);

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
      const locked = sold + reserved;

      // Status derivation
      let status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED' = 'ACTIVE';
      if (tt.archivedAt) status = 'ARCHIVED';
      else if (!tt.visibility || !tt.isActive) status = 'HIDDEN';

      const warnings: string[] = [];
      if (tt.capacity === 0) warnings.push('Capacity is zero.');
      if (tt.batches.length === 0) warnings.push('No active batches.');

      const nextAction = tt.archivedAt ? 'Archived' : 'Edit';

      results.push({
        id: tt.id,
        name: tt.name,
        status,
        capacity: tt.capacity,
        soldQuantity: sold,
        reservedQuantity: reserved,
        availableQuantity: Math.max(0, tt.capacity - locked),
        lockedQuantity: locked,
        basePrice: tt.batches[0] ? Number(tt.batches[0].price) : 0,
        batches: tt.batches.map(b => ({
          id: b.id,
          name: b.name,
          price: Number(b.price),
          totalQuantity: b.totalQuantity,
          availableQuantity: b.availableQuantity,
          soldQuantity: Math.max(0, b.totalQuantity - b.availableQuantity),
          status: b.status,
        })),
        refundable: tt.refundable,
        transferable: tt.transferable,
        purchaseLimit: tt.purchaseLimit,
        warnings,
        nextAction,
      });
    }
    return results;
  }

  async getTicketTypeDetail(eventId: string, ticketTypeId: string, organizerId?: string): Promise<any | null> {
    await this.checkEventOwnership(eventId, organizerId);
    const tt = await prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId },
      include: {
        batches: {
          where: { archivedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!tt) return null;

    const batchIds = tt.batches.map(b => b.id);
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

    // Status derivation
    let status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED' = 'ACTIVE';
    if (tt.archivedAt) status = 'ARCHIVED';
    else if (!tt.visibility || !tt.isActive) status = 'HIDDEN';

    return {
      id: tt.id,
      eventId: tt.eventId,
      information: {
        name: tt.name,
        description: tt.description ?? null,
        capacity: tt.capacity,
        status,
        visibility: tt.visibility,
        isActive: tt.isActive,
      },
      rules: {
        purchaseLimit: tt.purchaseLimit,
        purchaseMin: 1, // Fixed to 1 in Phase 5
        refundable: tt.refundable,
        transferable: tt.transferable,
        visibility: tt.visibility,
      },
      batches: tt.batches.map(b => ({
        id: b.id,
        name: b.name,
        price: Number(b.price),
        totalQuantity: b.totalQuantity,
        availableQuantity: b.availableQuantity,
        soldQuantity: Math.max(0, b.totalQuantity - b.availableQuantity),
        status: b.status,
      })),
    };
  }

  async getTicketTypeInformation(eventId: string, ticketTypeId: string, organizerId?: string) {
    const detail = await this.getTicketTypeDetail(eventId, ticketTypeId, organizerId);
    return detail ? detail.information : null;
  }

  async getTicketTypeBatches(eventId: string, ticketTypeId: string, organizerId?: string) {
    const detail = await this.getTicketTypeDetail(eventId, ticketTypeId, organizerId);
    return detail ? detail.batches : null;
  }

  async getTicketTypeRules(eventId: string, ticketTypeId: string, organizerId?: string) {
    const detail = await this.getTicketTypeDetail(eventId, ticketTypeId, organizerId);
    return detail ? detail.rules : null;
  }

  async listTicketBatches(eventId: string, ticketTypeId: string, organizerId?: string): Promise<any[]> {
    await this.checkEventOwnership(eventId, organizerId);

    const batches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, eventId, archivedAt: null },
      orderBy: { displayOrder: 'asc' },
    });

    const deriveStatus = (batch: any): string => {
      if (batch.archivedAt) return 'ARCHIVED';
      const now = new Date();
      if (batch.salesEnd && batch.salesEnd < now) return 'COMPLETED';
      if (batch.status === 'COMPLETED') return 'COMPLETED';
      if (batch.status === 'PAUSED' || !batch.isActive) return 'PAUSED';
      if (batch.salesStart && batch.salesStart > now) return 'PENDING';
      if (batch.status === 'ACTIVE' || batch.isActive) return 'ACTIVE';
      return batch.status;
    };

    return batches.map(b => ({
      id: b.id,
      name: b.name,
      price: Number(b.price),
      totalQuantity: b.totalQuantity,
      availableQuantity: b.availableQuantity,
      soldQuantity: Math.max(0, b.totalQuantity - b.availableQuantity),
      salesStart: b.salesStart ? b.salesStart.toISOString() : null,
      salesEnd: b.salesEnd ? b.salesEnd.toISOString() : null,
      visibility: b.isActive,
      displayOrder: b.displayOrder,
      status: deriveStatus(b),
    }));
  }

  async getTicketBatchDetail(eventId: string, ticketTypeId: string, batchId: string, organizerId?: string) {
    await this.checkEventOwnership(eventId, organizerId);
    const b = await prisma.ticketBatch.findFirst({
      where: { id: batchId, ticketTypeId, eventId },
    });
    if (!b) return null;

    const deriveStatus = (batch: any): string => {
      if (batch.archivedAt) return 'ARCHIVED';
      const now = new Date();
      if (batch.salesEnd && batch.salesEnd < now) return 'COMPLETED';
      if (batch.status === 'COMPLETED') return 'COMPLETED';
      if (batch.status === 'PAUSED' || !batch.isActive) return 'PAUSED';
      if (batch.salesStart && batch.salesStart > now) return 'PENDING';
      if (batch.status === 'ACTIVE' || batch.isActive) return 'ACTIVE';
      return batch.status;
    };

    return {
      id: b.id,
      eventId: b.eventId,
      ticketTypeId: b.ticketTypeId,
      name: b.name,
      price: Number(b.price),
      totalQuantity: b.totalQuantity,
      availableQuantity: b.availableQuantity,
      salesStart: b.salesStart ? b.salesStart.toISOString() : null,
      salesEnd: b.salesEnd ? b.salesEnd.toISOString() : null,
      purchaseLimit: b.purchaseLimit,
      visibility: b.isActive,
      status: deriveStatus(b),
      displayOrder: b.displayOrder,
    };
  }

  async getTicketBatchPreview(eventId: string, ticketTypeId: string, batchId: string, organizerId?: string) {
    await this.checkEventOwnership(eventId, organizerId);
    const tt = await prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId },
    });
    if (!tt) return null;

    const b = await prisma.ticketBatch.findFirst({
      where: { id: batchId, ticketTypeId, eventId },
    });
    if (!b) return null;

    const deriveStatus = (batch: any): string => {
      if (batch.archivedAt) return 'ARCHIVED';
      const now = new Date();
      if (batch.salesEnd && batch.salesEnd < now) return 'COMPLETED';
      if (batch.status === 'COMPLETED') return 'COMPLETED';
      if (batch.status === 'PAUSED' || !batch.isActive) return 'PAUSED';
      if (batch.salesStart && batch.salesStart > now) return 'PENDING';
      if (batch.status === 'ACTIVE' || batch.isActive) return 'ACTIVE';
      return batch.status;
    };

    const status = deriveStatus(b);
    const now = new Date();
    const blockingReasons: string[] = [];

    if (b.archivedAt) blockingReasons.push('Lote arquivado.');
    if (!b.isActive) blockingReasons.push('Lote inativo.');
    if (b.salesStart && b.salesStart > now) blockingReasons.push('Vendas ainda não iniciadas.');
    if (b.salesEnd && b.salesEnd < now) blockingReasons.push('Vendas encerradas.');
    if (b.availableQuantity <= 0) blockingReasons.push('Lote esgotado.');

    let availability = 'Disponível';
    if (b.availableQuantity <= 0) availability = 'Esgotado';
    else if (b.salesStart && b.salesStart > now) availability = 'Não Iniciado';
    else if (b.salesEnd && b.salesEnd < now) availability = 'Encerrado';

    const startStr = b.salesStart ? b.salesStart.toLocaleDateString('pt-BR') : 'Imediato';
    const endStr = b.salesEnd ? b.salesEnd.toLocaleDateString('pt-BR') : 'Até o evento';

    return {
      ticketTypeName: tt.name,
      batchName: b.name,
      price: Number(b.price),
      availability,
      salesWindow: `${startStr} - ${endStr}`,
      visibility: b.isActive,
      currentSellableState: blockingReasons.length === 0,
      blockingReasons,
    };
  }

  async validateTicketBatches(eventId: string, ticketTypeId: string, organizerId?: string) {
    await this.checkEventOwnership(eventId, organizerId);
    const tt = await prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId },
    });
    if (!tt) throw new Error('Ticket type not found');

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');

    const batches = await prisma.ticketBatch.findMany({
      where: { ticketTypeId, archivedAt: null },
      orderBy: { displayOrder: 'asc' },
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    const totalBatchCapacity = batches.reduce((sum, b) => sum + b.totalQuantity, 0);
    if (tt.capacity !== undefined && totalBatchCapacity > tt.capacity) {
      errors.push(`A capacidade total dos lotes (${totalBatchCapacity}) excede a capacidade do tipo de ingresso (${tt.capacity}).`);
    }

    const uniqueOrders = new Set(batches.map(b => b.displayOrder));
    if (uniqueOrders.size !== batches.length) {
      errors.push('A ordenação/posição dos lotes deve ser única.');
    }

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (b.price !== null && Number(b.price) < 0) {
        errors.push(`Lote "${b.name}": O preço não pode ser negativo.`);
      }
      if (b.totalQuantity <= 0) {
        errors.push(`Lote "${b.name}": A capacidade deve ser maior que zero.`);
      }
      if (b.salesStart && b.salesEnd && b.salesEnd <= b.salesStart) {
        errors.push(`Lote "${b.name}": Fim das vendas deve ser após o início.`);
      }

      for (let j = i + 1; j < batches.length; j++) {
        const other = batches[j];
        if (b.salesStart && other.salesStart && b.salesEnd && other.salesEnd) {
          const startsBeforeEnds = b.salesStart < other.salesEnd;
          const endsAfterStarts = b.salesEnd > other.salesStart;
          if (startsBeforeEnds && endsAfterStarts) {
            warnings.push(`Janela de vendas sobreposta entre os lotes "${b.name}" e "${other.name}".`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getPublishingChecklist(eventId: string, organizerId?: string): Promise<any> {
    await this.checkEventOwnership(eventId, organizerId);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: {
          where: { archivedAt: null },
          include: {
            batches: {
              where: { archivedAt: null }
            }
          }
        }
      }
    });

    if (!event) throw new Error('Event not found');

    const groups: any[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. Basic Info Group
    const basicItems: any[] = [];
    
    const namePass = !!event.title?.trim();
    basicItems.push({
      id: 'event-name',
      label: 'Nome do evento',
      status: namePass ? 'pass' : 'fail',
      severity: 'BLOCKER',
      fixUrl: `/events/${eventId}/edit`
    });
    if (!namePass) blockers.push('Nome do evento é obrigatório.');

    const slugPass = !!event.slug?.trim();
    let slugStatus: 'pass' | 'fail' = slugPass ? 'pass' : 'fail';
    if (slugPass) {
      const duplicate = await prisma.event.findFirst({
        where: { organizerId: event.organizerId, slug: event.slug, id: { not: eventId } }
      });
      if (duplicate) {
        slugStatus = 'fail';
        blockers.push('Slug já está em uso.');
      }
    } else {
      blockers.push('Slug do evento é obrigatório.');
    }
    basicItems.push({
      id: 'event-slug',
      label: 'Slug amigável e único',
      status: slugStatus,
      severity: 'BLOCKER',
      fixUrl: `/events/${eventId}/edit`
    });

    const startPass = !!event.date;
    basicItems.push({
      id: 'event-start',
      label: 'Data de início',
      status: startPass ? 'pass' : 'fail',
      severity: 'BLOCKER',
      fixUrl: `/events/${eventId}/edit`
    });
    if (!startPass) blockers.push('Data de início é obrigatória.');

    const endPass = !event.endDate || event.endDate > event.date;
    basicItems.push({
      id: 'event-end',
      label: 'Data de término coerente',
      status: endPass ? 'pass' : 'fail',
      severity: 'BLOCKER',
      fixUrl: `/events/${eventId}/edit`
    });
    if (!endPass) blockers.push('Data de término deve ser posterior à data de início.');

    const descPass = !!event.description?.trim();
    basicItems.push({
      id: 'event-description',
      label: 'Descrição completa do evento',
      status: descPass ? 'pass' : 'warn',
      severity: 'WARNING',
      fixUrl: `/events/${eventId}/edit`
    });
    if (!descPass) warnings.push('Descrição completa é recomendada.');

    const catPass = !!event.categoryId;
    basicItems.push({
      id: 'event-category',
      label: 'Categoria do evento',
      status: catPass ? 'pass' : 'warn',
      severity: 'WARNING',
      fixUrl: `/events/${eventId}/edit`
    });
    if (!catPass) warnings.push('Categoria do evento é recomendada.');

    groups.push({ name: 'Informações Básicas', items: basicItems });

    // 2. Media Group
    const mediaItems: any[] = [];
    const imagePass = !!event.imageUrl;
    mediaItems.push({
      id: 'event-banner',
      label: 'Banner do evento',
      status: imagePass ? 'pass' : 'warn',
      severity: 'WARNING',
      fixUrl: `/events/${eventId}/general`
    });
    if (!imagePass) warnings.push('Banner do evento é recomendado.');
    groups.push({ name: 'Mídia e Divulgação', items: mediaItems });

    // 3. Location Group
    const locItems: any[] = [];
    if (event.locationType === 'PHYSICAL' || event.locationType === 'HYBRID') {
      const addressPass = !!event.location?.trim();
      locItems.push({
        id: 'event-address',
        label: 'Endereço do local',
        status: addressPass ? 'pass' : 'fail',
        severity: 'BLOCKER',
        fixUrl: `/events/${eventId}/general`
      });
      if (!addressPass) blockers.push('Endereço é obrigatório para eventos presenciais/híbridos.');
    }
    if (event.locationType === 'ONLINE' || event.locationType === 'HYBRID') {
      const urlPass = !!event.onlineUrl?.trim();
      locItems.push({
        id: 'event-online-url',
        label: 'Link de transmissão',
        status: urlPass ? 'pass' : 'warn',
        severity: 'WARNING',
        fixUrl: `/events/${eventId}/general`
      });
      if (!urlPass) warnings.push('Link de transmissão é recomendado para eventos online/híbridos.');
    }
    groups.push({ name: 'Localização e Acesso', items: locItems });

    // 4. Tickets Group
    const ticketItems: any[] = [];
    const hasTickets = event.ticketTypes.length > 0;
    ticketItems.push({
      id: 'event-has-tickets',
      label: 'Possui tipo de ingresso ativo',
      status: hasTickets ? 'pass' : 'fail',
      severity: 'BLOCKER',
      fixUrl: `/events/${eventId}/tickets`
    });
    if (!hasTickets) blockers.push('O evento deve ter pelo menos um tipo de ingresso ativo.');

    if (hasTickets) {
      for (const tt of event.ticketTypes) {
        const capPass = tt.capacity > 0;
        ticketItems.push({
          id: `ticket-cap-${tt.id}`,
          label: `Capacidade do tipo "${tt.name}"`,
          status: capPass ? (tt.capacity < 10 ? 'warn' : 'pass') : 'fail',
          severity: capPass ? 'WARNING' : 'BLOCKER',
          fixUrl: `/events/${eventId}/tickets`
        });
        if (!capPass) blockers.push(`O tipo de ingresso "${tt.name}" deve ter capacidade maior que zero.`);
        else if (tt.capacity < 10) warnings.push(`Capacidade baixa no tipo de ingresso "${tt.name}" (${tt.capacity}).`);

        const hasBatches = tt.batches.length > 0;
        ticketItems.push({
          id: `ticket-batches-${tt.id}`,
          label: `Lotes do tipo "${tt.name}"`,
          status: hasBatches ? 'pass' : 'fail',
          severity: 'BLOCKER',
          fixUrl: `/events/${eventId}/tickets`
        });
        if (!hasBatches) blockers.push(`O tipo de ingresso "${tt.name}" deve ter pelo menos um lote ativo.`);
      }
    }
    groups.push({ name: 'Ingressos', items: ticketItems });

    // 5. Batches Group
    const batchItems: any[] = [];
    if (hasTickets) {
      for (const tt of event.ticketTypes) {
        for (const b of tt.batches) {
          const pricePass = b.price !== null && Number(b.price) >= 0;
          batchItems.push({
            id: `batch-price-${b.id}`,
            label: `Preço do lote "${b.name}"`,
            status: pricePass ? 'pass' : 'fail',
            severity: 'BLOCKER',
            fixUrl: `/events/${eventId}/tickets/${tt.id}/batches`
          });
          if (!pricePass) blockers.push(`Lote "${b.name}" do tipo "${tt.name}" tem preço inválido.`);

          const qtyPass = b.totalQuantity > 0;
          batchItems.push({
            id: `batch-qty-${b.id}`,
            label: `Capacidade do lote "${b.name}"`,
            status: qtyPass ? 'pass' : 'fail',
            severity: 'BLOCKER',
            fixUrl: `/events/${eventId}/tickets/${tt.id}/batches`
          });
          if (!qtyPass) blockers.push(`Lote "${b.name}" do tipo "${tt.name}" deve ter capacidade maior que zero.`);

          const datePass = !b.salesStart || !b.salesEnd || b.salesEnd > b.salesStart;
          batchItems.push({
            id: `batch-dates-${b.id}`,
            label: `Janela de vendas do lote "${b.name}"`,
            status: datePass ? 'pass' : 'fail',
            severity: 'BLOCKER',
            fixUrl: `/events/${eventId}/tickets/${tt.id}/batches`
          });
          if (!datePass) blockers.push(`Lote "${b.name}" do tipo "${tt.name}" tem janela de vendas inválida.`);
        }
      }
    }
    groups.push({ name: 'Lotes de Venda', items: batchItems });

    return {
      eventId,
      eventStatus: event.status,
      canPublish: blockers.length === 0,
      blockers,
      warnings,
      groups
    };
  }

  async getPublishingPreview(eventId: string, organizerId?: string): Promise<any> {
    await this.checkEventOwnership(eventId, organizerId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: {
          where: { archivedAt: null },
          include: {
            batches: {
              where: { archivedAt: null }
            }
          }
        }
      }
    });

    if (!event) throw new Error('Event not found');

    const tickets = event.ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      capacity: tt.capacity,
      price: tt.batches[0] ? Number(tt.batches[0].price) : 0
    }));

    const batches: any[] = [];
    event.ticketTypes.forEach(tt => {
      tt.batches.forEach(b => {
        batches.push({
          id: b.id,
          name: b.name,
          price: Number(b.price),
          availableQuantity: b.availableQuantity,
          salesStart: b.salesStart ? b.salesStart.toISOString() : null,
          salesEnd: b.salesEnd ? b.salesEnd.toISOString() : null
        });
      });
    });

    const checklist = await this.getPublishingChecklist(eventId, organizerId);

    return {
      event: {
        id: event.id,
        name: event.title,
        description: event.description,
        date: event.date.toISOString(),
        endDate: event.endDate ? event.endDate.toISOString() : null,
        locationType: event.locationType,
        location: event.location,
        venue: event.venue,
        imageUrl: event.imageUrl
      },
      tickets,
      batches,
      warnings: checklist.warnings
    };
  }
}

export const organizerEventsReadService = new OrganizerEventsReadService();
