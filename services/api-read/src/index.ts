import express from 'express';
import { prisma } from '@flux/database';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 3002;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable legacy X-RateLimit headers
  message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use(limiter);
app.use(express.json());

// Catalog endpoint (read-only)
app.get('/events', async (req, res) => {
  try {
    const { categoryId } = req.query;

    const where = categoryId
      ? { categoryId: Number(categoryId) }
      : {};

    const events = await prisma.event.findMany({
      where,
      include: {
        batches: true,
      },
      orderBy: { date: 'asc' },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve events catalog' });
  }
});

app.get('/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        batches: true,
      },
    });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve event' });
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
