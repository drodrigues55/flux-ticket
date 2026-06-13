import { z } from 'zod';

export const PaymentMethodPixSchema = z.object({
  method: z.literal('pix'),
});

export const PaymentMethodCardSchema = z.object({
  method: z.literal('credit_card'),
  token: z.string().min(1, 'Token do cartão é obrigatório'),
  installments: z.number().int().positive('Parcelas devem ser maiores que zero'),
  issuerId: z.string().min(1, 'Issuer ID é obrigatório'),
  email: z.string().email('E-mail inválido'),
});

export const CheckoutPaymentSchema = z.object({
  ticketId: z.string().uuid('ID do ingresso inválido'),
  paymentMethod: z.discriminatedUnion('method', [
    PaymentMethodPixSchema,
    PaymentMethodCardSchema,
  ]),
});

export type CheckoutPaymentDto = z.infer<typeof CheckoutPaymentSchema>;
