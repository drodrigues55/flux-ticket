import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyJson } from '../../../server/organizerProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const endpointPath = path && Array.isArray(path) ? path.join('/') : '';

  const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
  const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';

  if (req.method === 'GET') {
    const url = new URL(`/organization/${endpointPath}`, apiReadUrl);
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'path') {
        if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
        else if (value !== undefined) url.searchParams.set(key, value);
      }
    }
    return proxyJson(req, res, url.toString(), 'GET');
  }

  // POST / PATCH / DELETE go to write API
  const method = req.method as 'POST' | 'PATCH' | 'DELETE';
  const url = `${apiWriteUrl}/organization/${endpointPath}`;
  return proxyJson(req, res, url, method);
}
