import { Router } from 'express';
import { ok, fail } from '../api-response';
import { authMiddleware, AuthenticatedRequest } from '../auth-middleware';
import { RequestWithId } from '../request-id-middleware';
import { organizerFinanceReadService, rowsToCsv } from './organizer-finance.service';

export const organizerFinanceRouter = Router();

function requestId(req: RequestWithId) {
  return req.requestId || 'req_unknown';
}

function organizerId(req: AuthenticatedRequest) {
  return req.user?.role === 'ORGANIZER' ? req.user.userId : undefined;
}

function sendError(res: any, req: RequestWithId, statusCode: number, code: string, message: string, details?: unknown) {
  res.status(statusCode).json(fail({ code, message, statusCode, requestId: requestId(req), details }));
}

organizerFinanceRouter.use(authMiddleware);

organizerFinanceRouter.get('/overview', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    res.json(ok(await organizerFinanceReadService.getOverview(organizerId(req)), requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'FINANCE_OVERVIEW_ERROR', 'Failed to load financial overview.', error instanceof Error ? error.message : undefined);
  }
});

organizerFinanceRouter.get('/events', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    res.json(ok(await organizerFinanceReadService.listEvents(organizerId(req)), requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'FINANCE_EVENTS_ERROR', 'Failed to load financial events.', error instanceof Error ? error.message : undefined);
  }
});

organizerFinanceRouter.get('/events/:eventId', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const detail = await organizerFinanceReadService.getEventDetail(req.params.eventId, organizerId(req));
    if (!detail) return sendError(res, req, 404, 'FINANCE_EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.json(ok(detail, requestId(req)));
  } catch (error) {
    sendError(res, req, 500, 'FINANCE_EVENT_DETAIL_ERROR', 'Failed to load event financial detail.', error instanceof Error ? error.message : undefined);
  }
});

organizerFinanceRouter.get('/payments', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    res.json(ok(await organizerFinanceReadService.listPayments(req.query, organizerId(req)), requestId(req)));
  } catch (error) {
    sendError(res, req, 400, 'FINANCE_PAYMENT_LEDGER_QUERY_INVALID', 'Failed to load payment ledger.', error instanceof Error ? error.message : undefined);
  }
});

organizerFinanceRouter.get('/exports/payments.csv', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const exportResult = await organizerFinanceReadService.exportPaymentsCsv(req.query, organizerId(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(rowsToCsv(exportResult.rows));
  } catch (error) {
    sendError(res, req, 400, 'FINANCE_PAYMENT_EXPORT_ERROR', 'Failed to export payment ledger.', error instanceof Error ? error.message : undefined);
  }
});

organizerFinanceRouter.get('/exports/events/:eventId.csv', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const exportResult = await organizerFinanceReadService.exportEventCsv(req.params.eventId, req.query, organizerId(req));
    if (!exportResult) return sendError(res, req, 404, 'FINANCE_EVENT_NOT_FOUND', 'Event not found.', { eventId: req.params.eventId });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(rowsToCsv(exportResult.rows));
  } catch (error) {
    sendError(res, req, 400, 'FINANCE_EVENT_EXPORT_ERROR', 'Failed to export event financial summary.', error instanceof Error ? error.message : undefined);
  }
});
