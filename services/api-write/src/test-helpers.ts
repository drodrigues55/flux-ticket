import * as crypto from 'crypto';

export interface TestOrganizer {
  id: string;
  name: string;
  email: string;
}

export interface TestEvent {
  id: string;
  title: string;
  slug: string;
  date: Date;
  status: 'DRAFT' | 'READY_FOR_VALIDATION' | 'PUBLISHED' | 'ARCHIVED';
  locationType: 'PHYSICAL' | 'ONLINE' | 'HYBRID';
  location?: string;
  onlineUrl?: string;
}

export interface TestTicketType {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
  purchaseLimit: number;
  isActive: boolean;
}

export interface TestBatch {
  id: string;
  ticketTypeId: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  isActive: boolean;
}

export function createOrganizer(id = 'org-123'): TestOrganizer {
  return {
    id,
    name: 'Test Organizer',
    email: 'organizer@test.com',
  };
}

export function createEvent(status: TestEvent['status'] = 'DRAFT', options: Partial<TestEvent> = {}): TestEvent {
  return {
    id: options.id || 'evt-' + Math.random().toString(36).substring(7),
    title: options.title || 'Test Event',
    slug: options.slug || 'test-event-' + Math.random().toString(36).substring(7),
    date: options.date || new Date(Date.now() + 24 * 60 * 60 * 1000),
    status,
    locationType: options.locationType || 'PHYSICAL',
    location: options.location || '123 Main St',
    onlineUrl: options.onlineUrl,
  };
}

export function createTicketType(eventId: string, options: Partial<TestTicketType> = {}): TestTicketType {
  return {
    id: options.id || 'tt-' + Math.random().toString(36).substring(7),
    eventId,
    name: options.name || 'General Admission',
    capacity: options.capacity || 100,
    purchaseLimit: options.purchaseLimit || 5,
    isActive: options.isActive !== false,
  };
}

export function createBatch(ticketTypeId: string, options: Partial<TestBatch> = {}): TestBatch {
  return {
    id: options.id || 'b-' + Math.random().toString(36).substring(7),
    ticketTypeId,
    name: options.name || 'Early Bird',
    price: options.price !== undefined ? options.price : 50.0,
    totalQuantity: options.totalQuantity || 100,
    availableQuantity: options.availableQuantity !== undefined ? options.availableQuantity : 100,
    isActive: options.isActive !== false,
  };
}

export function generateQRSignature(ticketId: string, secret = 'default-super-secret-key-12345'): string {
  const payload = `${ticketId}:1`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function generateQRPayload(ticketId: string, cpf = '00000000000', batchId = 'b-1', sectorId = 1) {
  const signature = generateQRSignature(ticketId);
  return JSON.stringify({
    ticket_id: ticketId,
    buyer_cpf: cpf,
    batch_id: batchId,
    sector_id: sectorId,
    signature,
  });
}
