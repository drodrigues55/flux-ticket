"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("@flux/database");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);
app.use(express_1.default.json());
// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
/**
 * Converts a raw TicketBatch DB row to the shared BatchInfo contract.
 * All computed fields (soldQuantity, occupancyPct) are resolved server-side.
 */
function toBatchInfo(batch) {
    const sold = batch.totalQuantity - batch.availableQuantity;
    return {
        id: batch.id,
        eventId: batch.eventId,
        name: batch.name,
        price: Number(batch.price),
        totalQuantity: batch.totalQuantity,
        availableQuantity: batch.availableQuantity,
        soldQuantity: sold,
        occupancyPct: batch.totalQuantity > 0
            ? Math.round((sold / batch.totalQuantity) * 100)
            : 0,
        sectorId: batch.sectorId ?? null,
        sectorName: batch.sectorName ?? null,
        meiaEntrada: batch.meiaEntrada,
        isActive: batch.isActive,
    };
}
/**
 * Computes event-level aggregated fields from batches.
 */
function computeEventAggregates(batches) {
    const totalCapacity = batches.reduce((s, b) => s + b.totalQuantity, 0);
    const totalSold = batches.reduce((s, b) => s + b.soldQuantity, 0);
    return {
        totalCapacity,
        totalSold,
        occupancyPct: totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
    };
}
// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
/**
 * GET /events
 * Returns full event catalog. Includes computed occupancyPct per batch.
 * Supports optional ?categoryId filter.
 */
app.get('/events', async (req, res) => {
    try {
        const { categoryId } = req.query;
        const where = categoryId ? { categoryId: Number(categoryId) } : {};
        const events = await database_1.prisma.event.findMany({
            where,
            include: { batches: true },
            orderBy: { date: 'asc' },
        });
        const result = events.map((event) => {
            const batches = event.batches.map(toBatchInfo);
            const agg = computeEventAggregates(batches);
            return {
                id: event.id,
                title: event.title,
                description: event.description ?? null,
                date: event.date.toISOString(),
                location: event.location,
                venue: event.venue ?? null,
                imageUrl: event.imageUrl ?? null,
                status: event.status,
                organizerId: event.organizerId,
                categoryId: event.categoryId ?? null,
                tags: event.tags ?? [],
                capacityTarget: event.capacityTarget ?? null,
                batches,
                ...agg,
                grossRevenue: 0, // not computed in public catalog; available in dashboard API
            };
        });
        res.json(result);
    }
    catch (error) {
        console.error('[API-READ] GET /events error:', error);
        res.status(500).json({ error: 'Failed to retrieve events catalog' });
    }
});
/**
 * GET /events/:id
 * Returns full event detail including batches with computed metrics.
 */
app.get('/events/:id', async (req, res) => {
    try {
        const event = await database_1.prisma.event.findUnique({
            where: { id: req.params.id },
            include: { batches: true },
        });
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const batches = event.batches.map(toBatchInfo);
        const agg = computeEventAggregates(batches);
        const result = {
            id: event.id,
            title: event.title,
            description: event.description ?? null,
            date: event.date.toISOString(),
            location: event.location,
            venue: event.venue ?? null,
            imageUrl: event.imageUrl ?? null,
            status: event.status,
            organizerId: event.organizerId,
            categoryId: event.categoryId ?? null,
            tags: event.tags ?? [],
            capacityTarget: event.capacityTarget ?? null,
            batches,
            ...agg,
            grossRevenue: 0,
        };
        res.json(result);
    }
    catch (error) {
        console.error('[API-READ] GET /events/:id error:', error);
        res.status(500).json({ error: 'Failed to retrieve event' });
    }
});
const auth_middleware_1 = require("./auth-middleware");
/**
 * GET /events/:id/staff-sync
 * Ultra-lightweight endpoint for offline PWA check-in sync.
 * Returns only ticket IDs and HMAC signatures for VALID tickets.
 */
app.get('/events/:id/staff-sync', auth_middleware_1.authMiddleware, async (req, res) => {
    const eventId = req.params.id;
    try {
        const tickets = await database_1.prisma.ticket.findMany({
            where: { eventId, status: 'VALID' },
            select: { id: true, hmacSignature: true },
        });
        const payload = tickets.map((t) => ({
            ticket_id: t.id,
            hmacSignature: t.hmacSignature,
        }));
        res.json(payload);
    }
    catch (error) {
        console.error('[API-READ] GET /events/:id/staff-sync error:', error);
        res.status(500).json({ error: 'Failed to synchronize event tickets' });
    }
});
app.listen(port, () => {
    console.log(`api-read service listening on port ${port}`);
});
//# sourceMappingURL=index.js.map