export declare class TicketCryptoService {
    private readonly secretKey;
    /**
     * Gera a assinatura HMAC SHA-256 para garantir a autenticidade offline do ingresso.
     */
    generateSignature(ticketId: string, buyerCpf: string, batchId: string): string;
}
//# sourceMappingURL=ticket-crypto.service.d.ts.map