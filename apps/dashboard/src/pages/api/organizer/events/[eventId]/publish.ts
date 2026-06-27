import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyJson } from '../../../../../server/organizerProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { eventId } = req.query;
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({
      error: { code: 'EVENT_ID_REQUIRED', message: 'eventId is required', statusCode: 400, requestId: 'req_publishing_proxy' },
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', statusCode: 405, requestId: 'req_publishing_proxy' },
    });
  }

  const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
  return proxyJson(req, res, `${apiWriteUrl}/organizer/events/${eventId}/publish`, 'POST');
}
