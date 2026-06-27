import { z } from 'zod';

export const EventLocationTypeSchema = z.enum(['PHYSICAL', 'ONLINE', 'HYBRID']);
export const EventCreationStepSchema = z.enum(['BASIC_INFORMATION', 'TICKETS', 'REVIEW', 'PUBLISH_ENTRY']);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const EventSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  date: z.string().min(1, 'A data de início é obrigatória.'),
  time: z.string().min(1, 'A hora de início é obrigatória.'),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(3, 'A localização é obrigatória.'),
});

// Outras validações relacionadas a eventos (ex: Ticket Batch) podem vir aqui
export const TicketBatchSchema = z.object({
  name: z.string().min(1, 'O nome do lote é obrigatório'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo'),
  quantity: z.coerce.number().int().min(1, 'A quantidade deve ser pelo menos 1'),
});

export const CreateEventInputSchema = z.object({
  name: z.string().trim().min(1, 'O nome do evento é obrigatório.'),
  slug: z.string().trim().min(1, 'O slug é obrigatório.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.'),
  shortDescription: optionalText,
  description: optionalText,
  categoryId: z.coerce.number().int().positive().optional(),
  startAt: z.string().datetime('A data de início é inválida.'),
  endAt: z.string().datetime('A data de término é inválida.').optional(),
  timezone: z.string().trim().min(1, 'O fuso horário é obrigatório.'),
  locationType: EventLocationTypeSchema,
  venueName: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  state: optionalText,
  postalCode: optionalText,
  country: optionalText,
  onlineUrl: optionalText,
  bannerImageUrl: optionalText,
  capacityTarget: z.coerce.number().int().positive().optional(),
});

export const UpdateEventBasicInfoInputSchema = CreateEventInputSchema.partial().extend({
  name: z.string().trim().min(1, 'O nome do evento é obrigatório.').optional(),
  slug: z.string().trim().min(1, 'O slug é obrigatório.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.').optional(),
});

export const MinimalTicketTypeInputSchema = z.object({
  name: z.string().trim().min(1, 'O nome do ingresso é obrigatório.'),
  description: optionalText,
  quantity: z.coerce.number().int().positive('A quantidade deve ser maior que zero.'),
  basePrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  salesStart: z.string().datetime('O início das vendas é inválido.').optional(),
  salesEnd: z.string().datetime('O fim das vendas é inválido.').optional(),
});

export const OrganizerEventListQuerySchema = z.object({
  search: optionalText,
  status: z.enum(['DRAFT', 'READY_FOR_VALIDATION', 'PUBLISHED', 'SALES_OPEN', 'LIVE', 'FINISHED', 'ARCHIVED', 'CANCELLED']).optional(),
  sort: z.enum(['updatedAt', 'startAt', 'name']).default('updatedAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  startFrom: z.string().datetime().optional(),
  startTo: z.string().datetime().optional(),
});

export const UpdateEventGeneralInputSchema = UpdateEventBasicInfoInputSchema;

export const ArchiveEventInputSchema = z.object({
  reason: optionalText,
});

export const DuplicateEventInputSchema = z.object({
  name: optionalText,
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.').optional(),
});

export type EventCreationStep = z.infer<typeof EventCreationStepSchema>;
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type UpdateEventBasicInfoInput = z.infer<typeof UpdateEventBasicInfoInputSchema>;
export type MinimalTicketTypeInput = z.infer<typeof MinimalTicketTypeInputSchema>;
export type OrganizerEventListQuery = z.infer<typeof OrganizerEventListQuerySchema>;
export type UpdateEventGeneralInput = z.infer<typeof UpdateEventGeneralInputSchema>;
export type ArchiveEventInput = z.infer<typeof ArchiveEventInputSchema>;
export type DuplicateEventInput = z.infer<typeof DuplicateEventInputSchema>;

export interface EventCreationDraft {
  event: {
    id: string;
    name: string;
    slug: string | null;
    shortDescription: string | null;
    description: string | null;
    categoryId: number | null;
    startAt: string;
    endAt: string | null;
    timezone: string | null;
    locationType: z.infer<typeof EventLocationTypeSchema>;
    venueName: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    onlineUrl: string | null;
    bannerImageUrl: string | null;
    capacityTarget: number | null;
    status: 'DRAFT' | 'READY_FOR_VALIDATION' | 'PUBLISHED' | 'SALES_OPEN' | 'LIVE' | 'FINISHED' | 'ARCHIVED' | 'CANCELLED';
  };
  ticketType: {
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    basePrice: number;
    salesStart: string | null;
    salesEnd: string | null;
    batchId: string | null;
  } | null;
  currentStep: EventCreationStep;
}

export interface EventCreationReview extends EventCreationDraft {
  blockers: string[];
  warnings: string[];
}

export interface OrganizerEventListItem {
  id: string;
  name: string;
  slug: string | null;
  thumbnailUrl: string | null;
  status: 'DRAFT' | 'READY_FOR_VALIDATION' | 'PUBLISHED' | 'SALES_OPEN' | 'LIVE' | 'FINISHED' | 'ARCHIVED' | 'CANCELLED';
  startAt: string;
  locationSummary: string;
  ticketSummary: string;
  occupancyPct: number | null;
  revenue: number | null;
  updatedAt: string;
  nextAction: 'Continue setup' | 'Review publishing' | 'Manage event' | 'View archive';
}

export interface OrganizerEventListResponse {
  items: OrganizerEventListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type OrganizerEventGeneral = EventCreationDraft['event'] & {
  updatedAt: string;
  createdAt: string;
};

export interface OrganizerEventOverview {
  event: OrganizerEventGeneral;
  ticketSummary: {
    ticketTypeCount: number;
    totalCapacity: number;
    totalSold: number;
    occupancyPct: number | null;
    grossRevenue: number;
  };
  warnings: string[];
  blockers: string[];
}

export interface OrganizerEventDetail {
  event: OrganizerEventGeneral;
  overview: OrganizerEventOverview;
  canDelete: boolean;
  canArchive: boolean;
  canDuplicate: boolean;
}

export const CreateTicketTypeInputSchema = z.object({
  name: z.string().trim().min(1, 'O nome do ingresso é obrigatório.'),
  capacity: z.coerce.number().int().positive('A quantidade deve ser maior que zero.'),
});

export const UpdateTicketTypeInformationInputSchema = z.object({
  name: z.string().trim().min(1, 'O nome do ingresso é obrigatório.').optional(),
  description: optionalText,
  capacity: z.coerce.number().int().positive('A quantidade deve ser maior que zero.').optional(),
  visibility: z.boolean().optional(),
  isActive: z.boolean().optional(),
  basePrice: z.coerce.number().min(0, 'O preço não pode ser negativo.').optional(),
});

export const UpdateTicketTypeRulesInputSchema = z.object({
  purchaseLimit: z.coerce.number().int().positive('O limite de compra deve ser maior que zero.'),
  refundable: z.boolean(),
  transferable: z.boolean(),
  visibility: z.boolean(),
});

export const DuplicateTicketTypeInputSchema = z.object({});
export const ArchiveTicketTypeInputSchema = z.object({});

export type CreateTicketTypeInput = z.infer<typeof CreateTicketTypeInputSchema>;
export type UpdateTicketTypeInformationInput = z.infer<typeof UpdateTicketTypeInformationInputSchema>;
export type UpdateTicketTypeRulesInput = z.infer<typeof UpdateTicketTypeRulesInputSchema>;
export type DuplicateTicketTypeInput = z.infer<typeof DuplicateTicketTypeInputSchema>;
export type ArchiveTicketTypeInput = z.infer<typeof ArchiveTicketTypeInputSchema>;

export const CreateTicketBatchInputSchema = z.object({
  name: z.string().trim().min(1, 'O nome do lote é obrigatório.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  totalQuantity: z.coerce.number().int().positive('A quantidade deve ser maior que zero.'),
  salesStart: z.string().datetime('A data de início das vendas é inválida.').optional().nullable(),
  salesEnd: z.string().datetime('A data de término das vendas é inválida.').optional().nullable(),
  purchaseLimit: z.coerce.number().int().positive('O limite de compra deve ser maior que zero.').optional().nullable(),
  visibility: z.boolean().optional(),
});

export const UpdateTicketBatchInputSchema = CreateTicketBatchInputSchema.partial();

export const ReorderTicketBatchesInputSchema = z.object({
  batchIds: z.array(z.string().uuid('ID de lote inválido.')),
});

export type CreateTicketBatchInput = z.infer<typeof CreateTicketBatchInputSchema>;
export type UpdateTicketBatchInput = z.infer<typeof UpdateTicketBatchInputSchema>;
export type ReorderTicketBatchesInput = z.infer<typeof ReorderTicketBatchesInputSchema>;


