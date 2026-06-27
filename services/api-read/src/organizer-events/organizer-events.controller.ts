import { Router } from 'express';
import { ok, fail } from '../api-response';
import { authMiddleware, AuthenticatedRequest } from '../auth-middleware';
import { RequestWithId } from '../request-id-middleware';
import { organizerEventsReadService } from './organizer-events.service';

export const organizerEventsRouter = Router();

function requestId(req: RequestWithId) {
  return req.requestId || 'req_unknown';
}

function organizerId(req: AuthenticatedRequest) {
  return req.user?.role === 'ORGANIZER' ? req.user.userId : undefined;
}

function sendError(res: any, req: RequestWithId, statusCode: number, code: string, message: string, details?: unknown) {
  res.status(statusCode).json(fail({
    code,
    message,
    statusCode,
    requestId: requestId(req),
    details,
  }));
}

organizerEventsRouter.use(authMiddleware);

organizerEventsRouter.get('/', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.listEvents(req.query, organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 400, 'EVENT_LIST_QUERY_INVALID', 'Failed to load organizer events.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const detail = await organizerEventsReadService.getDetail(req.params.eventId, organizerId(req));
    if (!detail) return sendError(res, req, 404, 'EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.json(ok(detail, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'EVENT_DETAIL_READ_ERROR', 'Failed to load event detail.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/overview', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const overview = await organizerEventsReadService.getOverview(req.params.eventId, organizerId(req));
    if (!overview) return sendError(res, req, 404, 'EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.json(ok(overview, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'EVENT_OVERVIEW_READ_ERROR', 'Failed to load event overview.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/general', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const general = await organizerEventsReadService.getGeneral(req.params.eventId, organizerId(req));
    if (!general) return sendError(res, req, 404, 'EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.json(ok(general, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'EVENT_GENERAL_READ_ERROR', 'Failed to load event general info.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/edit', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const draft = await organizerEventsReadService.getEditDraft(req.params.eventId, organizerId(req));
    if (!draft) return sendError(res, req, 404, 'EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.json(ok(draft, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'EVENT_EDIT_READ_ERROR', 'Failed to load event draft.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/review', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const review = await organizerEventsReadService.getReview(req.params.eventId, organizerId(req));
    if (!review) return sendError(res, req, 404, 'EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.json(ok(review, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'EVENT_REVIEW_READ_ERROR', 'Failed to load event review.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.listTicketTypes(req.params.eventId, organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'TICKET_TYPES_READ_ERROR', 'Failed to load ticket types.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.getTicketTypeDetail(req.params.eventId, req.params.ticketTypeId, organizerId(req));
    if (!data) return sendError(res, req, 404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.', { ticketTypeId: req.params.ticketTypeId });
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'TICKET_TYPE_DETAIL_READ_ERROR', 'Failed to load ticket type detail.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/information', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.getTicketTypeInformation(req.params.eventId, req.params.ticketTypeId, organizerId(req));
    if (!data) return sendError(res, req, 404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.', { ticketTypeId: req.params.ticketTypeId });
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'TICKET_TYPE_INFO_READ_ERROR', 'Failed to load ticket type information.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/batches', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.getTicketTypeBatches(req.params.eventId, req.params.ticketTypeId, organizerId(req));
    if (!data) return sendError(res, req, 404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.', { ticketTypeId: req.params.ticketTypeId });
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'TICKET_TYPE_BATCHES_READ_ERROR', 'Failed to load ticket type batches.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/rules', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.getTicketTypeRules(req.params.eventId, req.params.ticketTypeId, organizerId(req));
    if (!data) return sendError(res, req, 404, 'TICKET_TYPE_NOT_FOUND', 'Ticket type not found.', { ticketTypeId: req.params.ticketTypeId });
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'TICKET_TYPE_RULES_READ_ERROR', 'Failed to load ticket type rules.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/batches/validation', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.validateTicketBatches(req.params.eventId, req.params.ticketTypeId, organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'BATCHES_VALIDATION_ERROR', 'Failed to validate ticket batches.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/batches', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.listTicketBatches(req.params.eventId, req.params.ticketTypeId, organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'BATCHES_READ_ERROR', 'Failed to load ticket batches.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/batches/:batchId/preview', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.getTicketBatchPreview(req.params.eventId, req.params.ticketTypeId, req.params.batchId, organizerId(req));
    if (!data) return sendError(res, req, 404, 'BATCH_NOT_FOUND', 'Batch not found.', { batchId: req.params.batchId });
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'BATCH_PREVIEW_READ_ERROR', 'Failed to load batch preview.', error instanceof Error ? error.message : undefined);
  }
});

organizerEventsRouter.get('/:eventId/ticket-types/:ticketTypeId/batches/:batchId', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await organizerEventsReadService.getTicketBatchDetail(req.params.eventId, req.params.ticketTypeId, req.params.batchId, organizerId(req));
    if (!data) return sendError(res, req, 404, 'BATCH_NOT_FOUND', 'Batch not found.', { batchId: req.params.batchId });
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'BATCH_DETAIL_READ_ERROR', 'Failed to load batch detail.', error instanceof Error ? error.message : undefined);
  }
});

