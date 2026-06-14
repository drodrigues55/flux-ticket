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
        const { ticketIds } = body;
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            throw new common_1.BadRequestException('ticketIds deve ser um array não vazio.');
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
    /**
     * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reserva.
     */
    async renewLock(body) {
        const { userId, ticketId, batchId } = body;
        if (!userId || !ticketId || !batchId) {
            throw new common_1.BadRequestException('userId, ticketId e batchId são obrigatórios.');
        }
        try {
            const success = await this.checkoutService.renewTicketLock(userId, ticketId, batchId);
            return {
                success,
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
        const { eventId, batchId, price, isHalfPrice = false } = body;
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
        // 2. Chamar o checkout do CheckoutService para criar a reserva no banco/Redis
        const ticket = await this.checkoutService.checkout({
            userId: user.id,
            eventId,
            batchId,
            buyerCpf: '000.000.000-00', // Placeholder temporário a ser atualizado no pagamento
            price,
            isHalfPrice,
        });
        return {
            ticketId: ticket.id,
            userId: user.id,
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
exports.CheckoutController = CheckoutController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map