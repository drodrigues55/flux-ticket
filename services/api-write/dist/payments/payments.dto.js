"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutPaymentSchema = exports.PaymentMethodCardSchema = exports.PaymentMethodPixSchema = void 0;
const zod_1 = require("zod");
exports.PaymentMethodPixSchema = zod_1.z.object({
    method: zod_1.z.literal('pix'),
});
exports.PaymentMethodCardSchema = zod_1.z.object({
    method: zod_1.z.literal('credit_card'),
    token: zod_1.z.string().min(1, 'Token do cartão é obrigatório'),
    installments: zod_1.z.number().int().positive('Parcelas devem ser maiores que zero'),
    issuerId: zod_1.z.string().min(1, 'Issuer ID é obrigatório'),
    email: zod_1.z.string().email('E-mail inválido'),
});
exports.CheckoutPaymentSchema = zod_1.z.object({
    ticketId: zod_1.z.string().uuid('ID do ingresso inválido'),
    buyerCpf: zod_1.z.string().min(11, 'CPF do comprador é obrigatório (mínimo 11 caracteres)'),
    email: zod_1.z.string().email('E-mail do comprador é obrigatório'),
    buyerName: zod_1.z.string().min(3, 'Nome do comprador é obrigatório (mínimo 3 caracteres)'),
    paymentMethod: zod_1.z.discriminatedUnion('method', [
        exports.PaymentMethodPixSchema,
        exports.PaymentMethodCardSchema,
    ]),
});
//# sourceMappingURL=payments.dto.js.map