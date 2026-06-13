import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class TicketCryptoService {
  private readonly secretKey = process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345';

  /**
   * Gera a assinatura HMAC SHA-256 para garantir a autenticidade offline do ingresso.
   */
  generateSignature(ticketId: string, buyerCpf: string, batchId: string): string {
    const payload = `${ticketId}:${buyerCpf}:${batchId}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }
}
