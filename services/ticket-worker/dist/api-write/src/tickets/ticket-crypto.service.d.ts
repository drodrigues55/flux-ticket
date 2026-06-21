export interface QrPayload {
    ticketId: string;
    version: number;
    signature: string;
}
export declare class TicketCryptoService {
    private readonly secretKey;
    /**
     * Gera a assinatura HMAC SHA-256 para garantir a autenticidade offline do ingresso.
     * Suporta o novo padrão compacto (ticketId:version) e o padrão antigo (ticketId:cpf:batchId) para compatibilidade.
     */
    generateSignature(ticketId: string, versionOrCpf?: number | string, batchId?: string): string;
    /**
     * Generates the immutable QR payload containing only ticketId, version, and signature.
     * Never contains PII or pricing.
     */
    generateQrPayload(ticketId: string, version?: number): QrPayload;
    /**
     * Generates a reusable QR image URL.
     */
    generateQrUrl(ticketId: string, version?: number): string;
    /**
     * Verifies the signature of a payload. Returns true if valid, false otherwise.
     * Executes signature check using HMAC before any database lookup.
     */
    verifySignature(ticketId: string, version: number, signature: string): boolean;
    /**
     * Parses and validates a QR payload string.
     */
    verifyRawPayload(payloadStr: string): {
        success: boolean;
        data?: QrPayload;
        reason?: string;
    };
}
//# sourceMappingURL=ticket-crypto.service.d.ts.map