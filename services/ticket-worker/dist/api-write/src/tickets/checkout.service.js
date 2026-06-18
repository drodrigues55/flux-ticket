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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@flux/database");
const crypto = __importStar(require("crypto"));
let CheckoutService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CheckoutService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CheckoutService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
            const batch = await database_1.prisma.ticketBatch.findUnique({
                where: { id: data.batchId },
            });
            if (!batch) {
                throw new common_1.BadRequestException('Lote não encontrado.');
            }
            // Guarantee the eventId is always consistent with the batch
            const resolvedEventId = batch.eventId || data.eventId;
            // Verifica se as vendas estão suspensas globalmente
            const isPaused = await this.fluxEngine.isSalesPaused();
            if (isPaused) {
                throw new common_1.BadRequestException('As vendas estão suspensas globalmente de forma temporária pelo organizador.');
            }
            // Verifica se o limite de conexões de checkout (throttle) foi atingido
            const activeLocks = await database_1.prisma.ticket.count({
                where: {
                    buyerCpf: '000.000.000-00',
                    expiresAt: { gt: new Date() },
                },
            });
            const limit = await this.fluxEngine.getCheckoutLimit();
            if (activeLocks >= limit) {
                throw new common_1.BadRequestException('Fila de checkout cheia. Limite de acessos simultâneos atingido. Tente novamente em alguns segundos.');
            }
            if (!batch.isActive) {
                throw new common_1.BadRequestException('As vendas para este lote estão pausadas temporariamente.');
            }
            // 0. Autoreparação: se o estoque não estiver inicializado no Redis (ex: após seed direto no banco), carrega do Postgres
            const isInitialized = await this.fluxEngine.isStockInitialized(data.batchId);
            if (!isInitialized) {
                await this.fluxEngine.setBatchStock(data.batchId, batch.availableQuantity);
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
                    // Criação do Ticket com status PENDING_VALIDATION.
                    // eventId é armazenado diretamente para evitar joins no dashboard.
                    const ticket = await tx.ticket.create({
                        data: {
                            id: ticketId,
                            eventId: resolvedEventId,
                            buyerId: data.userId,
                            batchId: data.batchId,
                            buyerCpf: data.buyerCpf,
                            price: data.price,
                            status: 'PENDING_VALIDATION',
                            channel: 'ONLINE',
                            meiaEntrada: data.isHalfPrice,
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
    return CheckoutService = _classThis;
})();
exports.CheckoutService = CheckoutService;
//# sourceMappingURL=checkout.service.js.map