"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("@flux/database");
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
app.use(express_1.default.json());
// Catalog endpoint (read-only)
app.get('/events', async (req, res) => {
    try {
        const events = await database_1.prisma.event.findMany({
            include: {
                batches: true,
            },
        });
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve events catalog' });
    }
});
const auth_middleware_1 = require("./auth-middleware");
// Endpoint de Sincronização da Portaria (Ultra-leve, sem dados pessoais)
app.get('/events/:id/staff-sync', auth_middleware_1.authMiddleware, async (req, res) => {
    const eventId = req.params.id;
    try {
        const tickets = await database_1.prisma.ticket.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to synchronize event tickets' });
    }
});
app.listen(port, () => {
    console.log(`api-read service listening on port ${port}`);
});
//# sourceMappingURL=index.js.map