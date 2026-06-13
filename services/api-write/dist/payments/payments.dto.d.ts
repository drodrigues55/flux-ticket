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
    method: "credit_card";
    token: string;
    installments: number;
    issuerId: string;
    email: string;
}, {
    method: "credit_card";
    token: string;
    installments: number;
    issuerId: string;
    email: string;
}>;
export declare const CheckoutPaymentSchema: z.ZodObject<{
    ticketId: z.ZodString;
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
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
        email: string;
    }, {
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
        email: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    ticketId: string;
    paymentMethod: {
        method: "pix";
    } | {
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
        email: string;
    };
}, {
    ticketId: string;
    paymentMethod: {
        method: "pix";
    } | {
        method: "credit_card";
        token: string;
        installments: number;
        issuerId: string;
        email: string;
    };
}>;
export type CheckoutPaymentDto = z.infer<typeof CheckoutPaymentSchema>;
//# sourceMappingURL=payments.dto.d.ts.map