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
