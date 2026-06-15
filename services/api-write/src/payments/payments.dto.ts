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
  ticketId: z.string().min(1, 'ID do ingresso inválido'),
  buyerCpf: z.string().min(11, 'CPF do comprador é obrigatório (mínimo 11 caracteres)'),
  email: z.string().email('E-mail do comprador é obrigatório'),
  buyerName: z.string().min(3, 'Nome do comprador é obrigatório (mínimo 3 caracteres)'),
  paymentMethod: z.discriminatedUnion('method', [
    PaymentMethodPixSchema,
    PaymentMethodCardSchema,
  ]),
  holders: z.array(
    z.object({
      name: z.string().min(3, 'Nome do titular é obrigatório'),
      cpf: z.string().min(11, 'CPF do titular é obrigatório'),
    })
  ).optional(),
});

export type CheckoutPaymentDto = z.infer<typeof CheckoutPaymentSchema>;
