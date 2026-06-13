import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId } = req.query;
  if (!eventId || typeof eventId !== 'string') {
    return res.status(400).json({ error: 'Parâmetro eventId inválido ou ausente.' });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    return res.status(200).json(event);
  } catch (error: any) {
    console.error('[API ERROR] Falha ao buscar detalhes do evento:', error);
    return res.status(500).json({ error: 'Erro interno ao recuperar detalhes do evento.' });
  }
}
