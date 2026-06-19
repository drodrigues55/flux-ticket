"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const database_1 = require("@flux/database");
const checkout_service_1 = require("./checkout.service");
const staff_guard_1 = require("./staff-guard");
const audit_service_1 = require("../audit/audit.service");
const domain_exceptions_1 = require("../domain-exceptions");
let CheckoutController = class CheckoutController {
    checkoutService;
    auditService;
    constructor(checkoutService, auditService) {
        this.checkoutService = checkoutService;
        this.auditService = auditService;
    }
    /**
     * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
     */
    async staffMutation(eventId, body, req) {
        const { ticketIds, deviceId, deviceName, pendingCount, allowedSectorIds } = body;
        if (deviceId && deviceName) {
            await this.checkoutService.fluxEngine.registerStaffDevice(eventId, deviceId, deviceName, pendingCount || 0, allowedSectorIds || []);
        }
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return {
                success: true,
                count: 0,
            };
        }
        const sectorRestricted = Array.isArray(allowedSectorIds) && allowedSectorIds.length > 0;
        if (sectorRestricted) {
            const disallowed = await database_1.prisma.ticket.count({
                where: {
                    id: { in: ticketIds },
                    batch: {
                        eventId,
                        sectorId: { notIn: allowedSectorIds },
                    },
                },
            });
            if (disallowed > 0) {
                throw new domain_exceptions_1.SectorAccessDeniedException({ eventId, deviceId, disallowedTickets: disallowed });
            }
        }
        // Executa a mutação em massa no Postgres
        const beforeTickets = await database_1.prisma.ticket.findMany({
            where: { id: { in: ticketIds }, batch: { eventId } },
            select: { id: true, status: true, checkedInAt: true },
        });
        const checkInDate = body.checkInTimestamp ? new Date(body.checkInTimestamp) : new Date();
        const result = await database_1.prisma.ticket.updateMany({
            where: {
                id: { in: ticketIds },
                batch: { eventId: eventId },
            },
            data: {
                status: 'CONSUMED',
                checkedInAt: checkInDate,
            },
        });
        await this.auditService.record({
            actorId: req.user?.userId,
            actorRole: req.user?.role,
            action: 'TICKET_STAFF_MUTATION',
            entityType: 'Ticket',
            entityId: eventId,
            before: beforeTickets,
            after: { status: 'CONSUMED', count: result.count, checkedInAt: checkInDate.toISOString() },
            metadata: { ticketIds, deviceId, deviceName, allowedSectorIds },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        console.log(`[MUTATION] ${result.count} ingressos marcados como CONSUMED offline para o evento ${eventId}.`);
        return {
            success: true,
            count: result.count,
        };
    }
    async setThrottle(body, req) {
        if (body.limit === undefined || body.limit < 0) {
            throw new common_1.BadRequestException('limit deve ser maior ou igual a 0.');
        }
        const previousLimit = await this.checkoutService.fluxEngine.getCheckoutLimit();
        await this.checkoutService.fluxEngine.setCheckoutLimit(body.limit);
        await this.auditService.record({
            actorId: req.user?.userId,
            actorRole: req.user?.role,
            action: 'SETTINGS_THROTTLE_UPDATED',
            entityType: 'Settings',
            entityId: 'checkout_limit',
            before: { limit: previousLimit },
            after: { limit: body.limit },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true, limit: body.limit };
    }
    async setPause(body, req) {
        if (body.paused === undefined) {
            throw new common_1.BadRequestException('paused é obrigatório.');
        }
        const previousPaused = await this.checkoutService.fluxEngine.isSalesPaused();
        await this.checkoutService.fluxEngine.setSalesPaused(body.paused);
        await this.auditService.record({
            actorId: req.user?.userId,
            actorRole: req.user?.role,
            action: 'SETTINGS_PAUSE_UPDATED',
            entityType: 'Settings',
            entityId: 'sales_paused',
            before: { paused: previousPaused },
            after: { paused: body.paused },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true, paused: body.paused };
    }
    async scanFail(eventId, body, req) {
        const increment = body.count || 1;
        let finalCount = 0;
        for (let i = 0; i < increment; i++) {
            finalCount = await this.checkoutService.fluxEngine.incrementDeniedAttempts(eventId);
        }
        await this.auditService.record({
            actorId: req.user?.userId,
            actorRole: req.user?.role,
            action: 'STAFF_SCAN_FAILED',
            entityType: 'Event',
            entityId: eventId,
            metadata: { increment, deniedAttempts: finalCount, deviceId: body.deviceId },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return { success: true, deniedAttempts: finalCount };
    }
    /**
     * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reserva.
     */
    async renewLock(body) {
        const { userId, ticketId, batchId } = body;
        if (!userId || !ticketId) {
            throw new common_1.BadRequestException('userId e ticketId são obrigatórios.');
        }
        try {
            const ticketIds = ticketId.split(',');
            let allSuccess = true;
            for (const tId of ticketIds) {
                let activeBatchId = batchId;
                // Se batchId não foi fornecido ou temos múltiplos tickets, consultamos no banco
                if (!activeBatchId || ticketIds.length > 1) {
                    const ticket = await database_1.prisma.ticket.findUnique({
                        where: { id: tId },
                        select: { batchId: true },
                    });
                    if (ticket) {
                        activeBatchId = ticket.batchId;
                    }
                }
                if (!activeBatchId) {
                    allSuccess = false;
                    continue;
                }
                const success = await this.checkoutService.renewTicketLock(userId, tId, activeBatchId);
                if (!success)
                    allSuccess = false;
            }
            return {
                success: allSuccess,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Falha ao estender lock do ingresso.');
        }
    }
    /**
     * Endpoint de Reserva de Ingresso: Chamado na inicialização da página de checkout para garantir a reserva do lote.
     */
    async reserve(body) {
        const { eventId } = body;
        if (!eventId) {
            throw new common_1.BadRequestException('eventId é obrigatório.');
        }
        // Normaliza para uma lista uniforme de itens a serem reservados
        let reservationItems = [];
        if (body.items && Array.isArray(body.items)) {
            reservationItems = body.items.map(item => ({
                batchId: item.batchId,
                price: Number(item.price),
                isHalfPrice: !!item.isHalfPrice,
                quantity: Number(item.quantity) || 1
            }));
        }
        else {
            if (!body.batchId || body.price === undefined) {
                throw new common_1.BadRequestException('batchId e price são obrigatórios se items não for fornecido.');
            }
            reservationItems = [{
                    batchId: body.batchId,
                    price: Number(body.price),
                    isHalfPrice: !!body.isHalfPrice,
                    quantity: Number(body.quantity) || 1
                }];
        }
        // 1. Garantir que exista um usuário guest no banco de dados para a reserva
        let user = await database_1.prisma.user.findUnique({
            where: { email: 'guest@flux.com' },
        });
        if (!user) {
            user = await database_1.prisma.user.create({
                data: {
                    email: 'guest@flux.com',
                    password: 'guest-password-hash-123',
                    name: 'Guest Buyer',
                    role: 'USER',
                },
            });
        }
        const ticketIds = [];
        const reservedBatchTickets = [];
        try {
            for (const item of reservationItems) {
                for (let i = 0; i < item.quantity; i++) {
                    const ticket = await this.checkoutService.checkout({
                        userId: user.id,
                        eventId,
                        batchId: item.batchId,
                        buyerCpf: '000.000.000-00', // Placeholder temporário a ser atualizado no pagamento
                        price: item.price,
                        isHalfPrice: item.isHalfPrice,
                    });
                    ticketIds.push(ticket.id);
                    reservedBatchTickets.push({ batchId: item.batchId, ticketId: ticket.id });
                    await this.auditService.record({
                        actorId: user.id,
                        actorRole: user.role,
                        action: 'TICKET_RESERVED',
                        entityType: 'Ticket',
                        entityId: ticket.id,
                        after: { status: ticket.status, batchId: item.batchId, eventId, price: item.price },
                        metadata: { isHalfPrice: item.isHalfPrice },
                    });
                }
            }
        }
        catch (error) {
            // Compensação imediata em caso de falha de estoque ou outra falha no loop
            for (const item of reservedBatchTickets) {
                try {
                    await this.checkoutService.fluxEngine.releaseTicketLock(item.batchId, user.id, item.ticketId);
                    await database_1.prisma.ticketBatch.update({
                        where: { id: item.batchId },
                        data: { availableQuantity: { increment: 1 } },
                    });
                    await database_1.prisma.ticket.delete({ where: { id: item.ticketId } });
                }
                catch (cleanupErr) {
                    console.error('[CLEANUP ERROR]', cleanupErr);
                }
            }
            if (error instanceof Error && error.message.toLowerCase().includes('estoque')) {
                throw new domain_exceptions_1.StockUnavailableException({ eventId, items: reservationItems });
            }
            throw error;
        }
        return {
            ticketId: ticketIds.join(','),
            userId: user.id,
        };
    }
    async getTelemetry(eventId) {
        const startTime = Date.now();
        // 1. Obter configurações
        const checkoutLimit = await this.checkoutService.fluxEngine.getCheckoutLimit();
        const salesPaused = await this.checkoutService.fluxEngine.isSalesPaused();
        // 2. Obter tentativas negadas e dispositivos de staff
        let deniedAttempts = 0;
        let staffDevices = [];
        if (eventId) {
            deniedAttempts = await this.checkoutService.fluxEngine.getDeniedAttempts(eventId);
            staffDevices = await this.checkoutService.fluxEngine.getStaffDevices(eventId);
        }
        // 3. Obter estatísticas do Cache do Redis
        const cacheStats = await this.checkoutService.fluxEngine.getRedisInfoStats();
        // 4. Obter/atualizar histórico da fila de validação
        const queueSize = await database_1.prisma.ticket.count({
            where: {
                status: 'PENDING_VALIDATION',
                buyerCpf: { not: '000.000.000-00' },
            },
        });
        await this.checkoutService.fluxEngine.addQueueSizeMetric(queueSize);
        // 5. Obter históricos
        const latencyHistory = await this.checkoutService.fluxEngine.getLatencyHistory();
        const queueSizeHistory = await this.checkoutService.fluxEngine.getQueueSizeHistory();
        // Registrar latência deste request
        const elapsed = Date.now() - startTime;
        await this.checkoutService.fluxEngine.addLatencyMetric(elapsed === 0 ? 1 : elapsed);
        return {
            checkoutLimit,
            salesPaused,
            deniedAttempts,
            staffDevices,
            cacheStats,
            latencyHistory,
            queueSizeHistory,
        };
    }
};
exports.CheckoutController = CheckoutController;
__decorate([
    (0, common_1.Post)('events/:id/staff-mutation'),
    (0, common_1.UseGuards)(staff_guard_1.StaffGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "staffMutation", null);
__decorate([
    (0, common_1.Post)('settings/throttle'),
    (0, common_1.UseGuards)(staff_guard_1.StaffGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "setThrottle", null);
__decorate([
    (0, common_1.Post)('settings/pause'),
    (0, common_1.UseGuards)(staff_guard_1.StaffGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "setPause", null);
__decorate([
    (0, common_1.Post)('events/:id/scan-fail'),
    (0, common_1.UseGuards)(staff_guard_1.StaffGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "scanFail", null);
__decorate([
    (0, common_1.Post)('tickets/renew-lock'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "renewLock", null);
__decorate([
    (0, common_1.Post)('tickets/reserve'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "reserve", null);
__decorate([
    (0, common_1.Get)('telemetry'),
    __param(0, (0, common_1.Query)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "getTelemetry", null);
exports.CheckoutController = CheckoutController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService,
        audit_service_1.AuditService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map