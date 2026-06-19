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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const payments_dto_1 = require("./payments.dto");
const domain_exceptions_1 = require("../domain-exceptions");
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async checkout(body) {
        const parseResult = payments_dto_1.CheckoutPaymentSchema.safeParse(body);
        if (!parseResult.success) {
            const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
            const hasCpfError = parseResult.error.errors.some((e) => e.path.includes('buyerCpf') || e.path.includes('cpf'));
            if (hasCpfError) {
                throw new domain_exceptions_1.InvalidCpfException({ errors: parseResult.error.errors });
            }
            throw new common_1.BadRequestException(`Erro de validação: ${errorMsg}`);
        }
        return this.paymentsService.processCheckout(parseResult.data);
    }
    async webhook(signatureHeader, req, query, body) {
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new common_1.BadRequestException('O corpo original bruto da requisição está ausente.');
        }
        // 1. Validar a assinatura criptográfica original
        const isValid = this.paymentsService.verifySignature(signatureHeader, rawBody, query);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Assinatura do webhook inválida.');
        }
        // 2. Processar a atualização tardia assíncrona do status
        const paymentId = body?.data?.id || query?.id || query['data.id'];
        if (paymentId) {
            this.paymentsService.handleWebhookNotification(paymentId.toString()).catch((err) => {
                console.error('[WEBHOOK NOTIFICATION ERROR]', err);
            });
        }
        return { received: true };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "checkout", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Headers)('x-signature')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "webhook", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map