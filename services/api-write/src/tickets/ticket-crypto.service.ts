import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface QrPayload {
  ticketId: string;
  version: number;
  signature: string;
}

@Injectable()
export class TicketCryptoService {
  private readonly secretKey = process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345';

  /**
   * Gera a assinatura HMAC SHA-256 para garantir a autenticidade offline do ingresso.
   * Suporta o novo padrão compacto (ticketId:version) e o padrão antigo (ticketId:cpf:batchId) para compatibilidade.
   */
  generateSignature(ticketId: string, versionOrCpf?: number | string, batchId?: string): string {
    if (typeof versionOrCpf === 'number' || versionOrCpf === undefined) {
      const version = versionOrCpf ?? 1;
      const payload = `${ticketId}:${version}`;
      return crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('hex');
    } else {
      const payload = `${ticketId}:${versionOrCpf}:${batchId || ''}`;
      return crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('hex');
    }
  }

  /**
   * Generates the immutable QR payload containing only ticketId, version, and signature.
   * Never contains PII or pricing.
   */
  generateQrPayload(ticketId: string, version: number = 1): QrPayload {
    const signature = this.generateSignature(ticketId, version);
    return {
      ticketId,
      version,
      signature,
    };
  }

  /**
   * Generates a reusable QR image URL.
   */
  generateQrUrl(ticketId: string, version: number = 1): string {
    const payload = this.generateQrPayload(ticketId, version);
    const dataString = JSON.stringify(payload);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dataString)}`;
  }

  /**
   * Verifies the signature of a payload. Returns true if valid, false otherwise.
   * Executes signature check using HMAC before any database lookup.
   */
  verifySignature(ticketId: string, version: number, signature: string): boolean {
    const expected = this.generateSignature(ticketId, version);
    return expected === signature;
  }

  /**
   * Parses and validates a QR payload string.
   */
  verifyRawPayload(payloadStr: string): { success: boolean; data?: QrPayload; reason?: string } {
    try {
      const parsed = JSON.parse(payloadStr) as QrPayload;
      if (!parsed.ticketId || typeof parsed.version !== 'number' || !parsed.signature) {
        return { success: false, reason: 'MALFORMED_PAYLOAD' };
      }
      const isValid = this.verifySignature(parsed.ticketId, parsed.version, parsed.signature);
      if (!isValid) {
        return { success: false, reason: 'INVALID_SIGNATURE' };
      }
      return { success: true, data: parsed };
    } catch {
      return { success: false, reason: 'MALFORMED_PAYLOAD' };
    }
  }
}

