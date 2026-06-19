import { FluxEngineService } from '../tickets/flux-engine.service';
import { TicketCryptoService } from '../tickets/ticket-crypto.service';
import { CheckoutPaymentDto } from './payments.dto';
import { AuditService } from '../audit/audit.service';
export declare class PaymentsService {
    private readonly fluxEngine;
    private readonly ticketCryptoService;
    private readonly auditService;
    private readonly logger;
    constructor(fluxEngine: FluxEngineService, ticketCryptoService: TicketCryptoService, auditService: AuditService);
    /**
     * Valida a assinatura de webhook enviada pelo Mercado Pago.
     * Utiliza o corpo bruto (Buffer) e o cabeçalho x-signature.
     */
    verifySignature(signatureHeader: string, rawBody: Buffer, query: any): boolean;
    /**
     * Processa o pagamento do checkout do ingresso.
     */
    processCheckout(dto: CheckoutPaymentDto): Promise<any>;
    /**
     * Gerencia a máquina de estados do pagamento.
     */
    private handlePaymentState;
    /**
     * Processa atualizações tardias de webhooks assíncronos.
     */
    handleWebhookNotification(paymentId: string): Promise<void>;
}
//# sourceMappingURL=payments.service.d.ts.map