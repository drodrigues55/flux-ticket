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
}
//# sourceMappingURL=checkout.controller.d.ts.map