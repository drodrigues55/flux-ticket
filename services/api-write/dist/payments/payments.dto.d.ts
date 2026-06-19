import { z } from 'zod';
export declare const PaymentMethodPixSchema: z.ZodObject<{
    method: z.ZodLiteral<"pix">;
}, "strip", z.ZodTypeAny, {
    method: "pix";
}, {
    method: "pix";
}>;
export declare const PaymentMethodCardSchema: z.ZodObject<{
    method: z.ZodLiteral<"credit_card">;
    token: z.ZodString;
    installments: z.ZodNumber;
    issuerId: z.ZodString;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    method: "credit_card";
    token: string;
    installments: number;
    issuerId: string;
}, {
    email: string;
    method: "credit_card";
    token: string;
    installments: number;
    issuerId: string;
}>;
export declare const CheckoutPaymentSchema: z.ZodObject<{
    ticketId: z.ZodString;
    buyerCpf: z.ZodEffects<z.ZodString, string, string>;
    email: z.ZodString;
    buyerName: z.ZodString;
    paymentMethod: z.ZodDiscriminatedUnion<"method", [z.ZodObject<{
        method: z.ZodLiteral<"pix">;
    }, "strip", z.ZodTypeAny, {
        method: "pix";
    }, {
        method: "pix";
    }>, z.ZodObject<{
        method: z.ZodLiteral<"credit_card">;
        token: z.ZodString;
        installments: z.ZodNumber;
        issuerId: z.ZodString;
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
    }, {
        email: string;
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
    }>]>;
    holders: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        cpf: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        cpf: string;
    }, {
        name: string;
        cpf: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    buyerCpf: string;
    ticketId: string;
    email: string;
    buyerName: string;
    paymentMethod: {
        method: "pix";
    } | {
        email: string;
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
    };
    holders?: {
        name: string;
        cpf: string;
    }[] | undefined;
}, {
    buyerCpf: string;
    ticketId: string;
    email: string;
    buyerName: string;
    paymentMethod: {
        method: "pix";
    } | {
        email: string;
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
    };
    holders?: {
        name: string;
        cpf: string;
    }[] | undefined;
}>;
export type CheckoutPaymentDto = z.infer<typeof CheckoutPaymentSchema>;
//# sourceMappingURL=payments.dto.d.ts.map