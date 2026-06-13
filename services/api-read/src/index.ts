import express from 'express';
import { prisma } from '@flux/database';

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());

// Catalog endpoint (read-only)
app.get('/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        batches: true,
      },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve events catalog' });
  }
});

import { authMiddleware } from './auth-middleware';

// Endpoint de Sincronização da Portaria (Ultra-leve, sem dados pessoais)
app.get('/events/:id/staff-sync', authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        batch: {
          eventId: eventId,
        },
        status: 'VALID',
      },
      select: {
        id: true,
        hmacSignature: true,
      },
    });

    // Mapeia para o payload ultra-leve exigido
    const payload = tickets.map(t => ({
      ticket_id: t.id,
      hmacSignature: t.hmacSignature,
    }));

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Failed to synchronize event tickets' });
  }
});

app.listen(port, () => {
  console.log(`api-read service listening on port ${port}`);
});
