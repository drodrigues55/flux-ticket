"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@flux/database");
const flux_engine_service_1 = require("./flux-engine.service");
const ticket_crypto_service_1 = require("./ticket-crypto.service");
const crypto = __importStar(require("crypto"));
let CheckoutService = class CheckoutService {
    fluxEngine;
    ticketCryptoService;
    constructor(fluxEngine, ticketCryptoService) {
        this.fluxEngine = fluxEngine;
        this.ticketCryptoService = ticketCryptoService;
    }
    /**
     * Realiza o checkout de compra de ingresso de forma atômica e consistente.
     */
    async checkout(data) {
        const ticketId = crypto.randomUUID();
        const reservationId = `${data.userId}:${ticketId}`;
        // 0. Autoreparação: se o estoque não estiver inicializado no Redis (ex: após seed direto no banco), carrega do Postgres
        const isInitialized = await this.fluxEngine.isStockInitialized(data.batchId);
        if (!isInitialized) {
            const batch = await database_1.prisma.ticketBatch.findUnique({
                where: { id: data.batchId },
            });
            if (batch) {
                await this.fluxEngine.setBatchStock(data.batchId, batch.availableQuantity);
            }
        }
        // 1. Reserva atômica no Redis (Lock temporário de 180 segundos)
        const success = await this.fluxEngine.reserveTickets(data.batchId, data.userId, ticketId, 1);
        if (!success) {
            throw new common_1.BadRequestException('Ingressos esgotados ou falha ao reservar no Redis.');
        }
        // 2. Transação ACID no PostgreSQL via Prisma
        try {
            const result = await database_1.prisma.$transaction(async (tx) => {
                // Decrementar estoque do lote no PostgreSQL
                await tx.ticketBatch.update({
                    where: { id: data.batchId },
                    data: {
                        availableQuantity: {
                            decrement: 1,
                        },
                    },
                });
                // Criação do Ticket com status PENDING_VALIDATION
                const ticket = await tx.ticket.create({
                    data: {
                        id: ticketId,
                        buyerId: data.userId,
                        batchId: data.batchId,
                        buyerCpf: data.buyerCpf,
                        price: data.price,
                        status: 'PENDING_VALIDATION',
                        expiresAt: new Date(Date.now() + 180 * 1000), // Válido por 3 minutos
                    },
                });
                // Criação do registro na tabela OutboxEvent para consistência eventual
                const outbox = await tx.outboxEvent.create({
                    data: {
                        aggregateType: 'TICKET_RESERVED',
                        aggregateId: ticketId,
                        payload: {
                            ticketId: ticket.id,
                            buyerId: data.userId,
                            batchId: data.batchId,
                            buyerCpf: data.buyerCpf,
                            price: data.price.toString(),
                            isHalfPrice: data.isHalfPrice,
                            eventId: data.eventId,
                        },
                    },
                });
                return { ticket, outbox };
            });
            return result.ticket;
        }
        catch (error) {
            // Ação de Compensação: Se falhar no banco relacional, devolvemos o estoque do Redis
            await this.fluxEngine.releaseTicketLock(data.batchId, data.userId, ticketId);
            throw error;
        }
    }
    /**
     * Aprova o pagamento de um ingresso, gerando a assinatura HMAC offline.
     */
    async approveTicketPayment(ticketId) {
        const ticket = await database_1.prisma.ticket.findUnique({
            where: { id: ticketId },
        });
        if (!ticket) {
            throw new common_1.BadRequestException('Ingresso não encontrado.');
        }
        // Gerar a assinatura HMAC
        const signature = this.ticketCryptoService.generateSignature(ticket.id, ticket.buyerCpf, ticket.batchId);
        // Atualizar o status para VALID e salvar a assinatura
        return database_1.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'VALID',
                hmacSignature: signature,
            },
        });
    }
    /**
     * Delega a renovação do lock temporário do ingresso no Redis.
     */
    async renewTicketLock(userId, ticketId, batchId) {
        return this.fluxEngine.renewTicketLock(userId, ticketId, batchId);
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [flux_engine_service_1.FluxEngineService,
        ticket_crypto_service_1.TicketCryptoService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map