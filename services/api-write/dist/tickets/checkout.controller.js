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
const database_1 = require("@flux/database");
const checkout_service_1 = require("./checkout.service");
const staff_guard_1 = require("./staff-guard");
let CheckoutController = class CheckoutController {
    checkoutService;
    constructor(checkoutService) {
        this.checkoutService = checkoutService;
    }
    /**
     * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
     */
    async staffMutation(eventId, body) {
        const { ticketIds, deviceId, deviceName, pendingCount } = body;
        if (deviceId && deviceName) {
            await this.checkoutService.fluxEngine.registerStaffDevice(eventId, deviceId, deviceName, pendingCount || 0);
        }
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return {
                success: true,
                count: 0,
            };
        }
        // Executa a mutação em massa no Postgres
        const result = await database_1.prisma.ticket.updateMany({
            where: {
                id: { in: ticketIds },
                batch: { eventId: eventId },
            },
            data: {
                status: 'CONSUMED',
            },
        });
        console.log(`[MUTATION] ${result.count} ingressos marcados como CONSUMED offline para o evento ${eventId}.`);
        return {
            success: true,
            count: result.count,
        };
    }
    async setThrottle(body) {
        if (body.limit === undefined || body.limit < 0) {
            throw new common_1.BadRequestException('limit deve ser maior ou igual a 0.');
        }
        await this.checkoutService.fluxEngine.setCheckoutLimit(body.limit);
        return { success: true, limit: body.limit };
    }
    async setPause(body) {
        if (body.paused === undefined) {
            throw new common_1.BadRequestException('paused é obrigatório.');
        }
        await this.checkoutService.fluxEngine.setSalesPaused(body.paused);
        return { success: true, paused: body.paused };
    }
    async scanFail(eventId, body) {
        const increment = body.count || 1;
        let finalCount = 0;
        for (let i = 0; i < increment; i++) {
            finalCount = await this.checkoutService.fluxEngine.incrementDeniedAttempts(eventId);
        }
        return { success: true, deniedAttempts: finalCount };
    }
    /**
     * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reserva.
     */
    async renewLock(body) {
        const { userId, ticketId, batchId } = body;
        if (!userId || !ticketId || !batchId) {
            throw new common_1.BadRequestException('userId, ticketId e batchId são obrigatórios.');
        }
        try {
            const ticketIds = ticketId.split(',');
            let allSuccess = true;
            for (const tId of ticketIds) {
                const success = await this.checkoutService.renewTicketLock(userId, tId, batchId);
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
        const { eventId, batchId, price, isHalfPrice = false, quantity = 1 } = body;
        if (!eventId || !batchId || price === undefined) {
            throw new common_1.BadRequestException('eventId, batchId e price são obrigatórios.');
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
        // 2. Chamar o checkout do CheckoutService em loop para criar a quantidade de reservas solicitadas
        const ticketIds = [];
        try {
            for (let i = 0; i < quantity; i++) {
                const ticket = await this.checkoutService.checkout({
                    userId: user.id,
                    eventId,
                    batchId,
                    buyerCpf: '000.000.000-00', // Placeholder temporário a ser atualizado no pagamento
                    price,
                    isHalfPrice,
                });
                ticketIds.push(ticket.id);
            }
        }
        catch (error) {
            // Compensação imediata em caso de falha de estoque ou outra falha no loop
            for (const tId of ticketIds) {
                try {
                    await this.checkoutService.fluxEngine.releaseTicketLock(batchId, user.id, tId);
                    await database_1.prisma.ticketBatch.update({
                        where: { id: batchId },
                        data: { availableQuantity: { increment: 1 } },
                    });
                    await database_1.prisma.ticket.delete({ where: { id: tId } });
                }
                catch (cleanupErr) {
                    console.error('[CLEANUP ERROR]', cleanupErr);
                }
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "staffMutation", null);
__decorate([
    (0, common_1.Post)('settings/throttle'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "setThrottle", null);
__decorate([
    (0, common_1.Post)('settings/pause'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "setPause", null);
__decorate([
    (0, common_1.Post)('events/:id/scan-fail'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "scanFail", null);
__decorate([
    (0, common_1.Post)('tickets/renew-lock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheckoutController.prototype, "renewLock", null);
__decorate([
    (0, common_1.Post)('tickets/reserve'),
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
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map