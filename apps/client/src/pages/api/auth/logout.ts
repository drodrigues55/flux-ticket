import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const secureCookie = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `flux_token=; Path=/; HttpOnly${secureCookie}; SameSite=Lax; Max-Age=0`);
  return res.status(200).json({ success: true });
}
