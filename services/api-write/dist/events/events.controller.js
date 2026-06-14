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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const events_service_1 = require("./events.service");
const staff_guard_1 = require("../tickets/staff-guard");
let EventsController = class EventsController {
    eventsService;
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    /**
     * Rota para criação de evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    async create(body, req) {
        const { title, date, location } = body;
        if (!title || !date || !location) {
            throw new common_1.BadRequestException('Os campos title, date e location são obrigatórios.');
        }
        const organizerId = req.user.userId;
        if (!organizerId) {
            throw new common_1.BadRequestException('Identificação do organizador ausente no token.');
        }
        return this.eventsService.createEvent(body, organizerId);
    }
    /**
     * Rota para listagem de todos os eventos do organizador.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    async findAll(req) {
        const organizerId = req.user.userId;
        if (!organizerId) {
            throw new common_1.BadRequestException('Identificação do organizador ausente no token.');
        }
        return this.eventsService.findAllEvents(organizerId);
    }
    /**
     * Rota para criação de lote de ingressos de um evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    async createBatch(eventId, body) {
        const { name, price, totalQuantity, sectorId, sectorName } = body;
        if (!name || price === undefined || totalQuantity === undefined) {
            throw new common_1.BadRequestException('Os campos name, price e totalQuantity são obrigatórios.');
        }
        if (price < 0 || totalQuantity < 0) {
            throw new common_1.BadRequestException('Preço e quantidade total devem ser maiores ou iguais a zero.');
        }
        return this.eventsService.createBatch(eventId, { name, price, totalQuantity, sectorId, sectorName });
    }
    /**
     * Rota para listagem de todos os lotes de um determinado evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    async findAllBatches(eventId) {
        if (!eventId) {
            throw new common_1.BadRequestException('O parâmetro eventId é obrigatório.');
        }
        return this.eventsService.findAllBatches(eventId);
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':eventId/batches'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "createBatch", null);
__decorate([
    (0, common_1.Get)(':eventId/batches'),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "findAllBatches", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)('events'),
    (0, common_1.UseGuards)(staff_guard_1.StaffGuard),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
//# sourceMappingURL=events.controller.js.map