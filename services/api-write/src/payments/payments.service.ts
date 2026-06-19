import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from '../tickets/flux-engine.service';
import { TicketCryptoService } from '../tickets/ticket-crypto.service';
import { CheckoutPaymentDto } from './payments.dto';
import { AuditService } from '../audit/audit.service';
import { recordTicketStatusHistory } from '../tickets/ticket-status-history';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly fluxEngine: FluxEngineService,
    private readonly ticketCryptoService: TicketCryptoService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Valida a assinatura de webhook enviada pelo Mercado Pago.
   * Utiliza o corpo bruto (Buffer) e o cabeçalho x-signature.
   */
  verifySignature(signatureHeader: string, rawBody: Buffer, query: any): boolean {
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    
    // Se não houver segredo configurado no ambiente, permite para facilitar testes locais
    if (!webhookSecret) {
      this.logger.warn('[PAYMENTS WEBHOOK] MERCADO_PAGO_WEBHOOK_SECRET não configurado. Ignorando validação criptográfica (apenas dev).');
      return true;
    }

    if (!signatureHeader) {
      this.logger.error('[PAYMENTS WEBHOOK] Cabeçalho x-signature ausente.');
      return false;
    }

    try {
      // Exemplo de formato: ts=1623594780,v1=abc123xyz...
      const parts = signatureHeader.split(',');
      const tsPart = parts.find((p) => p.trim().startsWith('ts='));
      const v1Part = parts.find((p) => p.trim().startsWith('v1='));

      if (!tsPart || !v1Part) {
        this.logger.error('[PAYMENTS WEBHOOK] Cabeçalho x-signature malformado.');
        return false;
      }

      const ts = tsPart.split('=')[1];
      const v1 = v1Part.split('=')[1];

      // Busca o ID do recurso (payment.id)
      const bodyJson = JSON.parse(rawBody.toString('utf8'));
      const paymentId = bodyJson?.data?.id || query?.id;

      if (!paymentId) {
        this.logger.error('[PAYMENTS WEBHOOK] ID do pagamento ausente no payload.');
        return false;
      }

      // Constrói a manifestação para validação
      const manifest = `id:${paymentId};request-timestamp:${ts};`;
      const calculatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(manifest)
        .digest('hex');

      const isValid = calculatedSignature === v1;
      if (!isValid) {
        this.logger.error('[PAYMENTS WEBHOOK] Assinatura do webhook inválida.');
      }
      return isValid;
    } catch (err: any) {
      this.logger.error('[PAYMENTS WEBHOOK] Erro ao validar assinatura do webhook.', err);
      return false;
    }
  }

  async receiveMercadoPagoWebhook(options: {
    signatureHeader?: string;
    rawBody: Buffer;
    query: any;
    body: any;
    requestId?: string | null;
  }) {
    const { signatureHeader, rawBody, query, body, requestId } = options;
    const isValid = this.verifySignature(signatureHeader || '', rawBody, query);

    if (!isValid) {
      return { received: false, valid: false };
    }

    const paymentId = (body?.data?.id || query?.id || query?.['data.id'] || '').toString();
    const providerEventId = (
      body?.id ||
      body?.event_id ||
      body?.resource ||
      query?.event_id ||
      paymentId ||
      crypto.createHash('sha256').update(rawBody).digest('hex')
    ).toString();

    const aggregateId = providerEventId || paymentId;

    const existing = await prisma.outboxEvent.findFirst({
      where: {
        type: 'payments.webhook',
        aggregateId,
        status: { in: ['PENDING', 'PROCESSED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return {
        received: true,
        valid: true,
        duplicate: true,
        outboxEventId: existing.id,
      };
    }

    const outboxEvent = await prisma.outboxEvent.create({
      data: {
        aggregateType: 'PAYMENT_WEBHOOK_RECEIVED',
        aggregateId,
        type: 'payments.webhook',
        status: 'PENDING',
        nextRunAt: new Date(),
        requestId: requestId ?? null,
        payload: {
          provider: 'MERCADO_PAGO',
          providerEventId,
          paymentId: paymentId || null,
          query,
          body,
          rawBody: rawBody.toString('utf8'),
          receivedAt: new Date().toISOString(),
        },
      },
    });

    return {
      received: true,
      valid: true,
      duplicate: false,
      outboxEventId: outboxEvent.id,
    };
  }

  /**
   * Processa o pagamento do checkout do ingresso.
   */
  async processCheckout(dto: CheckoutPaymentDto): Promise<any> {
    let ticketIds = dto.ticketId ? dto.ticketId.split(',') : [];
    
    // 1. Recupera os ingressos pré-reservados no Postgres
    const tickets = await prisma.ticket.findMany({
      where: dto.reservationId
        ? { reservationId: dto.reservationId }
        : { id: { in: ticketIds } },
      include: { batch: { include: { event: true } } },
    });
    ticketIds = tickets.map((ticket) => ticket.id);

    if (tickets.length === 0) {
      throw new BadRequestException('Ingressos não encontrados.');
    }

    for (const ticket of tickets) {
      if (ticket.status !== 'PENDING_VALIDATION' && ticket.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Um ou mais ingressos não estão elegíveis para pagamento.');
      }

      if (ticket.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('Sua reserva expirou e o ingresso foi liberado de volta ao estoque.');
      }
    }

    // 1.5. Busca ou cria o usuário com o e-mail real do comprador
    let user = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: dto.email,
          name: dto.buyerName,
          password: crypto.randomBytes(8).toString('hex'),
          role: 'USER',
        },
      });
    }

    // 1.6. Atualiza comprador, titulares e CPFs de cada ingresso
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const holder = dto.holders?.[i];
      const hName = holder ? holder.name : dto.buyerName;
      const hCpf = holder ? holder.cpf : dto.buyerCpf;
      
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { 
          buyerCpf: dto.buyerCpf,
          buyerId: user.id,
          holderName: hName,
          holderCpf: hCpf,
        },
      });
      ticket.buyerCpf = dto.buyerCpf;
      ticket.buyerId = user.id;
      ticket.holderName = hName;
      ticket.holderCpf = hCpf;
    }

    // 2. Calcula o valor em reais (o banco guarda em valor decimal normal)
    const amount = tickets.reduce((sum, t) => sum + Number(t.price), 0);
    const eventId = tickets[0].eventId || tickets[0].batch?.eventId;

    let order = dto.reservationId
      ? await (prisma as any).order.findFirst({ where: { reservationId: dto.reservationId } })
      : null;

    if (!order) {
      order = await (prisma as any).order.create({
        data: {
          reservationId: dto.reservationId ?? tickets[0].reservationId ?? null,
          eventId,
          buyerId: user.id,
          status: 'PROCESSING',
          grossAmount: amount,
          discountAmount: 0,
          netAmount: amount,
        },
      });
    } else {
      order = await (prisma as any).order.update({
        where: { id: order.id },
        data: {
          buyerId: user.id,
          status: 'PROCESSING',
          grossAmount: amount,
          netAmount: amount,
        },
      });
    }

    await prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data: { orderId: order.id },
    });

    let mpStatus = 'approved';
    let qrCode = '00020126580014br.gov.bcb.pix2536pix.example.com/qr/v2/mock-code-12345';
    let qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    let paymentId = 'mp-' + crypto.randomUUID();

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const isMockMode = !accessToken || accessToken.startsWith('TEST-mock') || accessToken === 'mock';

    if (!isMockMode) {
      // 3. Chamada real à API do Mercado Pago
      const payload: any = {
        transaction_amount: amount,
        description: `Ingressos do Show: ${tickets[0].batch.event.title} (${tickets.length}x)`,
        external_reference: ticketIds.join(','),
        payer: {
          email: dto.paymentMethod.method === 'credit_card' ? dto.paymentMethod.email : 'pix-buyer@flux.com',
        },
      };

      if (dto.paymentMethod.method === 'credit_card') {
        payload.payment_method_id = 'visa'; // Fallback
        payload.token = dto.paymentMethod.token;
        payload.installments = dto.paymentMethod.installments;
        payload.issuer_id = dto.paymentMethod.issuerId;
      } else {
        payload.payment_method_id = 'pix';
      }

      try {
        const response = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json() as any;
          throw new Error(errData.message || 'Erro na resposta do Mercado Pago.');
        }

        const mpData = await response.json() as any;
        mpStatus = mpData.status;
        paymentId = mpData.id.toString();
        if (mpData.payment_method_id === 'pix') {
          qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || qrCode;
          qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || qrCodeBase64;
        }
      } catch (err: any) {
        this.logger.error(`[MERCADO PAGO API ERROR] Falha no pagamento do ticket ${ticketIds.join(',')}`, err);
        mpStatus = 'rejected';
      }
    } else {
      // 4. Modo Mock local de simulação
      this.logger.log(`[MERCADO PAGO MOCK MODE] Processando pagamento de R$ ${amount} no ticket ${ticketIds.join(',')}`);
      if (dto.paymentMethod.method === 'credit_card') {
        const tokenStr = dto.paymentMethod.token;
        if (tokenStr.includes('pending') || tokenStr.includes('process')) {
          mpStatus = 'in_process';
        } else if (tokenStr.includes('rejected') || tokenStr.includes('fail')) {
          mpStatus = 'rejected';
        } else {
          mpStatus = 'approved';
        }
      } else {
        // PIX padrão pendente
        mpStatus = 'pending';
      }
    }

    // 5. Máquina de Estado e compensação
    return this.handlePaymentState(tickets, mpStatus, { qrCode, qrCodeBase64, paymentId }, dto, isMockMode, order);
  }

  /**
   * Gerencia a máquina de estados do pagamento.
   */
  private async handlePaymentState(
    tickets: any[],
    status: string,
    meta: { qrCode: string; qrCodeBase64: string; paymentId: string },
    dto?: any,
    isMockMode?: boolean,
    order?: any,
  ) {
    if (status === 'approved') {
      const finalStatuses: Array<{ id: string; finalStatus: string }> = [];

      for (const ticket of tickets) {
        const isStudent = ticket.meiaEntrada === true;
        const activeCpf = ticket.holderCpf || ticket.buyerCpf;
        const signature = this.ticketCryptoService.generateSignature(
          ticket.id,
          activeCpf,
          ticket.batchId
        );
        const newStatus = isStudent ? 'PENDING_VALIDATION' : 'VALID';

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: newStatus,
            hmacSignature: signature,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        await recordTicketStatusHistory({
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: newStatus,
          reason: 'PAYMENT_APPROVED',
          actorId: ticket.buyerId || dto?.email || null,
          metadata: { paymentId: meta.paymentId, orderId: order?.id ?? ticket.orderId ?? null },
        });

        await this.auditService.record({
          actorId: ticket.buyerId || dto?.email || null,
          actorRole: 'USER',
          action: 'TICKET_STATUS_CHANGED',
          entityType: 'Ticket',
          entityId: ticket.id,
          before: { status: ticket.status },
          after: { status: newStatus },
          metadata: { paymentId: meta.paymentId, paymentStatus: status, orderId: order?.id ?? null },
        });

        await this.fluxEngine.releaseTicketLock(ticket.batchId, ticket.buyerId, ticket.id);
        finalStatuses.push({ id: ticket.id, finalStatus: newStatus });
      }

      // ── Record Payment ──────────────────────────────────────────────
      const totalAmount = tickets.reduce((s, t) => s + Number(t.price), 0);
      const eventId = tickets[0].eventId || tickets[0].batch?.eventId;
      const buyerId = tickets[0].buyerId;
      const paymentMethod = dto?.paymentMethod?.method === 'pix' ? 'PIX' : 'CREDIT_CARD';

      let payment: any = null;
      try {
        if (order?.id) {
          await (prisma as any).order.update({
            where: { id: order.id },
            data: { status: 'PAID' },
          });
          const reservationId = order.reservationId || tickets[0].reservationId;
          if (reservationId) {
            await (prisma as any).reservation.update({
              where: { id: reservationId },
              data: { status: 'CONVERTED' },
            }).catch(() => undefined);
          }
        }
        payment = await prisma.payment.create({
          data: {
            eventId,
            buyerId,
            orderId: order?.id ?? null,
            method: paymentMethod,
            status: 'APPROVED',
            amount: totalAmount,
            installments: Number(dto?.paymentMethod?.installments) || 1,
            provider: isMockMode ? 'MOCK' : 'MERCADO_PAGO',
            providerPaymentId: meta.paymentId || null,
            idempotencyKey: meta.paymentId || null,
            rawPayload: { status, mock: !!isMockMode },
            paidAt: new Date(),
            tickets: { connect: tickets.map(t => ({ id: t.id })) },
          },
        });
      } catch (err) {
        this.logger.warn('[PAYMENT RECORD] Could not create Payment record (non-fatal):', err);
      }

      // ── Record SaleLog per ticket ────────────────────────────────────
      for (const ticket of tickets) {
        try {
          await prisma.saleLog.create({
            data: {
              eventId: ticket.eventId || ticket.batch?.eventId,
              ticketId: ticket.id,
              batchId: ticket.batchId,
              paymentId: payment?.id || null,
              buyerName: dto?.buyerName || ticket.buyer?.name || 'Unknown',
              buyerEmail: dto?.email || ticket.buyer?.email || '',
              holderName: ticket.holderName || null,
              batchName: ticket.batch?.name || '',
              eventTitle: ticket.batch?.event?.title || '',
              price: ticket.price,
              channel: 'ONLINE',
              method: paymentMethod,
              status: finalStatuses.find(s => s.id === ticket.id)?.finalStatus as any || 'VALID',
            },
          });
        } catch (err) {
          this.logger.warn('[SALE LOG] Could not create SaleLog record (non-fatal):', err);
        }
      }

      // ── Upsert DailySalesSnapshot ─────────────────────────────────────
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventId = tickets[0].eventId || tickets[0].batch?.eventId;
        if (eventId) {
          await prisma.dailySalesSnapshot.upsert({
            where: { eventId_date: { eventId, date: today } },
            create: { eventId, date: today, revenue: totalAmount, ticketsSold: tickets.length },
            update: {
              revenue: { increment: totalAmount },
              ticketsSold: { increment: tickets.length },
            },
          });
        }
      } catch (err) {
        this.logger.warn('[SNAPSHOT] Could not upsert DailySalesSnapshot (non-fatal):', err);
      }
      
      this.logger.log(`[PAYMENT SUCCESS] ${tickets.length} tickets aprovados.`);

      return {
        status: 'approved',
        ticketId: tickets.map(t => t.id).join(','),
        isStudent: tickets.some(t => t.meiaEntrada === true),
      };
    } else if (status === 'in_process' || status === 'pending') {
      // Pendente / Em Análise: Salva como PENDING_PAYMENT e estende expirations
      const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // +15 minutos
      
      for (const ticket of tickets) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'PENDING_PAYMENT',
            expiresAt: newExpiresAt,
          },
        });

        await recordTicketStatusHistory({
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: 'PENDING_PAYMENT',
          reason: 'PAYMENT_PENDING',
          actorId: ticket.buyerId || dto?.email || null,
          metadata: { paymentId: meta.paymentId, orderId: order?.id ?? ticket.orderId ?? null },
        });

        await this.auditService.record({
          actorId: ticket.buyerId || dto?.email || null,
          actorRole: 'USER',
          action: 'TICKET_STATUS_CHANGED',
          entityType: 'Ticket',
          entityId: ticket.id,
          before: { status: ticket.status },
          after: { status: 'PENDING_PAYMENT' },
          metadata: { paymentId: meta.paymentId, paymentStatus: status, orderId: order?.id ?? null },
        });

        // Estende o lock no Redis para 15 minutos (900s)
        await this.fluxEngine.extendTicketLock(ticket.buyerId, ticket.id, ticket.batchId, 900);
      }

      try {
        if (order?.id) {
          await (prisma as any).order.update({
            where: { id: order.id },
            data: { status: 'PROCESSING' },
          });
        }
        await prisma.payment.create({
          data: {
            eventId: tickets[0].eventId || tickets[0].batch?.eventId,
            buyerId: tickets[0].buyerId,
            orderId: order?.id ?? null,
            method: dto?.paymentMethod?.method === 'pix' ? 'PIX' : 'CREDIT_CARD',
            status: 'PENDING',
            amount: tickets.reduce((s, t) => s + Number(t.price), 0),
            installments: Number(dto?.paymentMethod?.installments) || 1,
            provider: isMockMode ? 'MOCK' : 'MERCADO_PAGO',
            providerPaymentId: meta.paymentId || null,
            idempotencyKey: meta.paymentId || null,
            rawPayload: { status, mock: !!isMockMode },
            tickets: { connect: tickets.map(t => ({ id: t.id })) },
          },
        });
      } catch (err) {
        this.logger.warn('[PAYMENT RECORD] Could not create pending Payment record (non-fatal):', err);
      }
      
      this.logger.log(`[PAYMENT PENDING] ${tickets.length} tickets pendentes. Locks do Redis estendidos por 15min.`);

      return {
        status: status === 'in_process' ? 'in_process' : 'pending',
        ticketId: tickets.map(t => t.id).join(','),
        qrCode: meta.qrCode,
        qrCodeBase64: meta.qrCodeBase64,
        paymentId: meta.paymentId,
      };
    } else {
      // Rejeitado / Cancelado: Executa a ação de compensação (devolve estoque)
      this.logger.warn(`[PAYMENT REJECTED] Ingressos rejeitados. Executando compensação...`);

      for (const ticket of tickets) {
        await recordTicketStatusHistory({
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: 'REVOKED',
          reason: 'PAYMENT_REJECTED',
          actorId: ticket.buyerId || dto?.email || null,
          metadata: { paymentStatus: status, orderId: order?.id ?? ticket.orderId ?? null },
        }).catch(() => undefined);

        // Devolve o estoque do Redis
        await this.fluxEngine.releaseTicketLock(ticket.batchId, ticket.buyerId, ticket.id);

        // Restaura o estoque no PostgreSQL
        await prisma.ticketBatch.update({
          where: { id: ticket.batchId },
          data: {
            availableQuantity: {
              increment: 1,
            },
          },
        });

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'REVOKED',
            expiresAt: new Date(),
          },
        });

        await this.auditService.record({
          actorId: ticket.buyerId || dto?.email || null,
          actorRole: 'USER',
          action: 'TICKET_PAYMENT_REJECTED',
          entityType: 'Ticket',
          entityId: ticket.id,
          before: { status: ticket.status },
          after: { status: 'REVOKED' },
          metadata: { paymentStatus: status, orderId: order?.id ?? null },
        });
      }

      try {
        if (order?.id) {
          await (prisma as any).order.update({
            where: { id: order.id },
            data: { status: 'FAILED' },
          });
          const reservationId = order.reservationId || tickets[0].reservationId;
          if (reservationId) {
            await (prisma as any).reservation.update({
              where: { id: reservationId },
              data: { status: 'CANCELLED' },
            }).catch(() => undefined);
          }
        }
        await prisma.payment.create({
          data: {
            eventId: tickets[0].eventId || tickets[0].batch?.eventId,
            buyerId: tickets[0].buyerId,
            orderId: order?.id ?? null,
            method: dto?.paymentMethod?.method === 'pix' ? 'PIX' : 'CREDIT_CARD',
            status: 'REJECTED',
            amount: tickets.reduce((s, t) => s + Number(t.price), 0),
            installments: Number(dto?.paymentMethod?.installments) || 1,
            provider: isMockMode ? 'MOCK' : 'MERCADO_PAGO',
            providerPaymentId: meta.paymentId || null,
            idempotencyKey: meta.paymentId || null,
            rawPayload: { status, mock: !!isMockMode },
          },
        });
      } catch (err) {
        this.logger.warn('[PAYMENT RECORD] Could not create rejected Payment record (non-fatal):', err);
      }

      throw new BadRequestException('O pagamento foi recusado pela instituição financeira ou cancelado.');
    }
  }

  /**
   * Processa atualizações tardias de webhooks assíncronos.
   */
  async handleWebhookNotification(paymentId: string): Promise<void> {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const isMockMode = !accessToken || accessToken.startsWith('TEST-mock') || accessToken === 'mock';

    let status = 'approved';
    let externalReference = '';

    if (!isMockMode) {
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (!res.ok) {
          throw new Error('Falha ao recuperar detalhes do pagamento do webhook');
        }

        const data = await res.json() as any;
        status = data.status;
        externalReference = data.external_reference;
      } catch (err: any) {
        this.logger.error(`[MERCADO PAGO WEBHOOK API ERROR] Falha ao recuperar status do webhook payment ${paymentId}`, err);
        return;
      }
    } else {
      // Em dev mockado: ID contendo "reject" vira rejected, resto approved
      status = paymentId.includes('reject') ? 'rejected' : 'approved';
      
      // Localiza o ticket pendente mais antigo no banco para aplicar a atualização mock
      const pendingTicket = await prisma.ticket.findFirst({
        where: { status: 'PENDING_PAYMENT' },
      });
      if (pendingTicket) {
        externalReference = pendingTicket.id;
      } else {
        this.logger.warn('[PAYMENTS WEBHOOK MOCK] Nenhum ticket em status PENDING_PAYMENT encontrado para atualizar.');
        return;
      }
    }

    if (!externalReference) return;

    // Busca os Tickets associados
    const ticketIds = externalReference.split(',');
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
    });

    if (tickets.length === 0) {
      this.logger.warn(`[PAYMENTS WEBHOOK] Tickets com IDs ${externalReference} não localizados.`);
      return;
    }

    this.logger.log(`[PAYMENTS WEBHOOK] Atualizando ${tickets.length} tickets para status tardio: ${status}`);
    
    // Atualiza usando a máquina de estados existente
    try {
      await this.handlePaymentState(tickets, status, { qrCode: '', qrCodeBase64: '', paymentId });
    } catch (err: any) {
      this.logger.error(`[PAYMENTS WEBHOOK ERROR] Falha ao transicionar estado dos tickets ${externalReference}`, err);
    }
  }
}
