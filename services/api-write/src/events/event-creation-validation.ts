import { BadRequestException } from '@nestjs/common';

export function validationError(code: string, message: string, details?: unknown) {
  return new BadRequestException({ code, message, details });
}

export function validateEventDateRange(startAt?: string, endAt?: string) {
  if (!startAt) {
    throw validationError('EVENT_START_REQUIRED', 'startAt is required.', { field: 'startAt' });
  }

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    throw validationError('EVENT_START_INVALID', 'startAt is invalid.', { field: 'startAt' });
  }

  if (endAt) {
    const end = new Date(endAt);
    if (Number.isNaN(end.getTime()) || end <= start) {
      throw validationError('EVENT_END_INVALID', 'endAt must be after startAt.', { field: 'endAt' });
    }
  }
}

export function validateTicketConfiguration(input: {
  quantity: number;
  basePrice: number;
  salesStart?: string;
  salesEnd?: string;
}, event: { date: Date; endDate: Date | null }) {
  if (input.quantity <= 0) {
    throw validationError('TICKET_QUANTITY_INVALID', 'Ticket quantity must be greater than zero.', { field: 'quantity' });
  }
  if (input.basePrice < 0) {
    throw validationError('TICKET_PRICE_INVALID', 'Ticket price must be zero or greater.', { field: 'basePrice' });
  }

  const salesStart = input.salesStart ? new Date(input.salesStart) : null;
  const salesEnd = input.salesEnd ? new Date(input.salesEnd) : null;

  if (salesStart && salesStart > event.date) {
    throw validationError('TICKET_SALES_START_INVALID', 'Ticket sales start must not be after event start.', { field: 'salesStart' });
  }
  if (salesStart && salesEnd && salesEnd <= salesStart) {
    throw validationError('TICKET_SALES_END_INVALID', 'Ticket sales end must be after ticket sales start.', { field: 'salesEnd' });
  }
  if (salesEnd && event.endDate && salesEnd > event.endDate) {
    throw validationError('TICKET_SALES_END_AFTER_EVENT', 'Ticket sales end must not be after event end.', { field: 'salesEnd' });
  }
}
