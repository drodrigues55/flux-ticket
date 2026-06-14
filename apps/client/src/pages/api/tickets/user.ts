import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: { buyerId: userId },
      include: {
        batch: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format results to serialize Decimals
    const formattedTickets = tickets.map((t) => ({
      id: t.id,
      buyerCpf: t.buyerCpf,
      status: t.status,
      price: t.price.toNumber(),
      meiaEntrada: t.meiaEntrada,
      hmacSignature: t.hmacSignature,
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
      batch: {
        id: t.batch.id,
        name: t.batch.name,
        sectorName: t.batch.sectorName,
        event: {
          id: t.batch.event.id,
          title: t.batch.event.title,
          date: t.batch.event.date.toISOString(),
          location: t.batch.event.location,
        },
      },
    }));

    return res.status(200).json(formattedTickets);
  } catch (error: any) {
    console.error('[USER TICKETS API ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error fetching tickets' });
  }
}
