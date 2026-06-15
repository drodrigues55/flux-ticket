import { FluxEngineService } from './flux-engine.service';
import { TicketCryptoService } from './ticket-crypto.service';
export declare class CheckoutService {
    private readonly fluxEngine;
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
        buyerId: string;
        buyerCpf: string;
        price: import("@prisma/client/runtime/library").Decimal;
        meiaEntrada: boolean;
        hmacSignature: string | null;
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
        buyerId: string;
        buyerCpf: string;
        price: import("@prisma/client/runtime/library").Decimal;
        meiaEntrada: boolean;
        hmacSignature: string | null;
        expiresAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Delega a renovação do lock temporário do ingresso no Redis.
     */
    renewTicketLock(userId: string, ticketId: string, batchId: string): Promise<boolean>;
}
//# sourceMappingURL=checkout.service.d.ts.map