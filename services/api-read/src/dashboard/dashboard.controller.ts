import { Router } from 'express';
import { ok, fail } from '../api-response';
import { authMiddleware, AuthenticatedRequest } from '../auth-middleware';
import { RequestWithId } from '../request-id-middleware';
import { dashboardService } from './dashboard.service';

export const dashboardRouter = Router();

function requestId(req: RequestWithId) {
  return req.requestId || 'req_unknown';
}

function organizerId(req: AuthenticatedRequest) {
  return req.user?.role === 'ORGANIZER' ? req.user.userId : undefined;
}

function sendError(res: any, req: RequestWithId, error: unknown, code: string, message: string) {
  res.status(500).json(fail({
    code,
    message,
    statusCode: 500,
    requestId: requestId(req),
    details: error instanceof Error ? error.message : undefined,
  }));
}

function sendDashboardError(
  res: any,
  req: RequestWithId,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  res.status(statusCode).json(fail({
    code,
    message,
    statusCode,
    requestId: requestId(req),
    details,
  }));
}

dashboardRouter.use(authMiddleware);

dashboardRouter.get('/overview', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await dashboardService.getOverview(organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, error, 'DASHBOARD_OVERVIEW_ERROR', 'Failed to load dashboard overview');
  }
});

dashboardRouter.get('/priority-event', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await dashboardService.getPriorityEvent(organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, error, 'DASHBOARD_PRIORITY_EVENT_ERROR', 'Failed to load priority event');
  }
});

dashboardRouter.get('/events-priority', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await dashboardService.getEventsPriority(organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, error, 'DASHBOARD_EVENTS_PRIORITY_ERROR', 'Failed to load event priorities');
  }
});

dashboardRouter.get('/events/lots-performance', async (req: RequestWithId, res) => {
  sendDashboardError(
    res,
    req,
    400,
    'DASHBOARD_EVENT_ID_REQUIRED',
    'eventId is required.',
    { param: 'eventId' }
  );
});

dashboardRouter.get('/events/:eventId/lots-performance', async (req: RequestWithId, res) => {
  try {
    const eventId = req.params.eventId?.trim();
    if (!eventId) {
      return sendDashboardError(
        res,
        req,
        400,
        'DASHBOARD_EVENT_ID_REQUIRED',
        'eventId is required.',
        { param: 'eventId' }
      );
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,}$/.test(eventId)) {
      return sendDashboardError(
        res,
        req,
        400,
        'DASHBOARD_EVENT_ID_INVALID',
        'eventId is malformed.',
        { param: 'eventId', value: req.params.eventId }
      );
    }

    const data = await dashboardService.getLotsPerformance(req.params.eventId);
    if (!data) {
      return sendDashboardError(
        res,
        req,
        404,
        'DASHBOARD_EVENT_NOT_FOUND',
        'Event not found.',
        { eventId }
      );
    }
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, error, 'DASHBOARD_LOTS_PERFORMANCE_ERROR', 'Failed to load lot performance');
  }
});

dashboardRouter.get('/alerts', async (req: AuthenticatedRequest & RequestWithId, res) => {
  try {
    const data = await dashboardService.getAlerts(organizerId(req));
    res.json(ok(data, requestId(req)));
  } catch (error) {
    sendError(res, req, error, 'DASHBOARD_ALERTS_ERROR', 'Failed to load dashboard alerts');
  }
});
