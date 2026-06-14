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
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@flux/database");
const flux_engine_service_1 = require("../tickets/flux-engine.service");
let EventsService = EventsService_1 = class EventsService {
    fluxEngine;
    logger = new common_1.Logger(EventsService_1.name);
    constructor(fluxEngine) {
        this.fluxEngine = fluxEngine;
    }
    /**
     * Cria um novo evento vinculando-o ao organizerId recebido do JWT.
     */
    async createEvent(data, organizerId) {
        return database_1.prisma.event.create({
            data: {
                title: data.title,
                description: data.description,
                date: new Date(data.date),
                location: data.location,
                categoryId: data.categoryId,
                organizerId: organizerId,
            },
        });
    }
    /**
     * Lista todos os eventos pertencentes ao organizador autenticado.
     */
    async findAllEvents(organizerId) {
        return database_1.prisma.event.findMany({
            where: {
                organizerId: organizerId,
            },
            orderBy: {
                date: 'asc',
            },
        });
    }
    /**
     * Cria um novo lote de ingressos de forma consistente.
     * Inicializa o estoque no Redis e faz rollback no Postgres se falhar.
     * Converte o preço de reais para centavos inteiros.
     */
    async createBatch(eventId, data) {
        // 1. Converter preço para centavos inteiros
        const priceInCentavos = Math.round(data.price * 100);
        // 2. Gravação relacional no PostgreSQL
        const batch = await database_1.prisma.ticketBatch.create({
            data: {
                eventId: eventId,
                name: data.name,
                price: priceInCentavos,
                totalQuantity: data.totalQuantity,
                availableQuantity: data.totalQuantity,
                sectorId: data.sectorId,
                sectorName: data.sectorName || data.name,
            },
        });
        // 3. Inicialização de estoque no cache Redis
        try {
            await this.fluxEngine.setBatchStock(batch.id, data.totalQuantity);
            this.logger.log(`[BATCH SYNC] Estoque do lote ${batch.id} (${data.name}) de ${data.totalQuantity} vagas inicializado no Redis Cluster.`);
            return batch;
        }
        catch (error) {
            this.logger.error(`[BATCH SYNC ERROR] Falha ao sincronizar lote ${batch.id} com o Redis. Executando compensação relacional...`, error);
            // Ação de compensação: Remove do PostgreSQL relacional
            try {
                await database_1.prisma.ticketBatch.delete({
                    where: { id: batch.id },
                });
            }
            catch (dbError) {
                this.logger.error(`[COMPENSATION FATAL] Falha ao remover lote órfão ${batch.id} do banco relacional!`, dbError);
            }
            throw new common_1.InternalServerErrorException('Falha crítica de comunicação com o cluster de cache. O lote não pôde ser criado.');
        }
    }
    /**
     * Lista todos os lotes cadastrados para um determinado evento.
     */
    async findAllBatches(eventId) {
        return database_1.prisma.ticketBatch.findMany({
            where: {
                eventId: eventId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [flux_engine_service_1.FluxEngineService])
], EventsService);
//# sourceMappingURL=events.service.js.map