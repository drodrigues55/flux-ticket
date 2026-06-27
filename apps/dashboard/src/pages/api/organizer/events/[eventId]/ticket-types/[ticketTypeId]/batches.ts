import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyJson } from '../../../../../../../server/organizerProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { eventId, ticketTypeId } = req.query;
  if (!eventId || typeof eventId !== 'string' || !ticketTypeId || typeof ticketTypeId !== 'string') {
    return res.status(400).json({
      error: { code: 'TICKET_TYPE_PATH_REQUIRED', message: 'eventId and ticketTypeId are required', statusCode: 400, requestId: 'req_event_creation_proxy' },
    });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', statusCode: 405, requestId: 'req_event_creation_proxy' },
    });
  }

  const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
  return proxyJson(req, res, `${apiReadUrl}/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches`, 'GET');
}
