import { CheckoutService } from './checkout.service';
export declare class CheckoutController {
    private readonly checkoutService;
    constructor(checkoutService: CheckoutService);
    /**
     * Endpoint de Mutação de Borda: Chamado quando o PWA envia os check-ins offline em massa.
     */
    staffMutation(eventId: string, body: {
        ticketIds: string[];
        checkInTimestamp?: string;
    }): Promise<{
        success: boolean;
        count: number;
    }>;
    /**
     * Endpoint de Renovação de Lock: Chamado pelo hook React useTicketLock para evitar a expiração da reserva.
     */
    renewLock(body: {
        userId: string;
        ticketId: string;
        batchId: string;
    }): Promise<{
        success: boolean;
    }>;
    /**
     * Endpoint de Reserva de Ingresso: Chamado na inicialização da página de checkout para garantir a reserva do lote.
     */
    reserve(body: {
        eventId: string;
        batchId: string;
        price: number;
        isHalfPrice?: boolean;
        quantity?: number;
    }): Promise<{
        ticketId: string;
        userId: string;
    }>;
}
//# sourceMappingURL=checkout.controller.d.ts.map