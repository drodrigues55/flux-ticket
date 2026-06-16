import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';
import type { EventSummary } from '@flux/types';

/**
 * GET /api/dashboard/events
 * Returns the list of real events for the organizer.
 * Used by the dashboard event filter dropdown.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const organizer = await prisma.user.findFirst({ where: { role: 'ORGANIZER' } });
    if (!organizer) {
      return res.status(200).json([]);
    }

    const events = await prisma.event.findMany({
      where: { organizerId: organizer.id },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        venue: true,
        imageUrl: true,
        status: true,
        organizerId: true,
        categoryId: true,
      },
    });

    const result: (EventSummary & { label: string })[] = [
      {
        id: 'all',
        title: 'Todos os eventos',
        label: 'Todos os eventos',
        date: '',
        location: '',
        venue: null,
        imageUrl: null,
        status: 'PUBLISHED',
        organizerId: organizer.id,
        categoryId: null,
      },
      ...events.map(e => ({
        id: e.id,
        title: e.title,
        label: e.title,
        date: e.date.toISOString(),
        location: e.location,
        venue: e.venue ?? null,
        imageUrl: e.imageUrl ?? null,
        status: e.status as any,
        organizerId: e.organizerId,
        categoryId: e.categoryId ?? null,
      })),
    ];

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[DASHBOARD EVENTS API ERROR]', error);
    return res.status(500).json({ error: 'Erro ao carregar eventos.' });
  }
}
