import { FluxEngineService } from './flux-engine.service';
import { TicketCryptoService } from './ticket-crypto.service';
export declare class CheckoutService {
    readonly fluxEngine: FluxEngineService;
    private readonly ticketCryptoService;
    constructor(fluxEngine: FluxEngineService, ticketCryptoService: TicketCryptoService);
    /**
     * Realiza o checkout de compra de ingresso de forma atômica e consistente.
     */
    checkout(data: {
        userId: string;
        eventId: string;
        batchId: string;
        buyerCpf: string;
        price: number;
        isHalfPrice: boolean;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        batchId: string;
        eventId: string;
        buyerId: string;
        buyerCpf: string;
        holderName: string | null;
        holderCpf: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        channel: import(".prisma/client").$Enums.SalesChannel;
        meiaEntrada: boolean;
        isTransferred: boolean;
        hmacSignature: string | null;
        checkedInAt: Date | null;
        refundedAt: Date | null;
        expiresAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Aprova o pagamento de um ingresso, gerando a assinatura HMAC offline.
     */
    approveTicketPayment(ticketId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        batchId: string;
        eventId: string;
        buyerId: string;
        buyerCpf: string;
        holderName: string | null;
        holderCpf: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        channel: import(".prisma/client").$Enums.SalesChannel;
        meiaEntrada: boolean;
        isTransferred: boolean;
        hmacSignature: string | null;
        checkedInAt: Date | null;
        refundedAt: Date | null;
        expiresAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Delega a renovação do lock temporário do ingresso no Redis.
     */
    renewTicketLock(userId: string, ticketId: string, batchId: string): Promise<boolean>;
}
//# sourceMappingURL=checkout.service.d.ts.map