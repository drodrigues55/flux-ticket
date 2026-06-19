import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from '../tickets/flux-engine.service';
import { TicketCryptoService } from '../tickets/ticket-crypto.service';
import { CheckoutPaymentDto } from './payments.dto';
import { AuditService } from '../audit/audit.service';
import { recordTicketStatusHistory } from '../tickets/ticket-status-history';
import { getPaymentProvider } from './mock-payment.provider';
import { InternalPaymentStatus, ProviderPaymentResult, TemporaryProviderFailure } from './payment-provider';
import * as crypto from 'crypto';

const FINAL_RELEASE_STATUSES: InternalPaymentStatus[] = ['REJECTED', 'EXPIRED', 'CANCELLED', 'FAILED'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly provider = getPaymentProvider();

  constructor(
    private readonly fluxEngine: FluxEngineService,
    private readonly ticketCryptoService: TicketCryptoService,
    private readonly auditService: AuditService
  ) {}

  verifySignature(): boolean {
    return true;
  }

  async receiveMercadoPagoWebhook(options: {
    signatureHeader?: string;
    rawBody: Buffer;
    query: any;
    body: any;
    requestId?: string | null;
  }) {
    return this.receivePaymentWebhook(options);
  }

  async receivePaymentWebhook(options: {
    signatureHeader?: string;
    rawBody: Buffer;
    query: any;
    body: any;
    requestId?: string | null;
  }) {
    const parsed = await this.provider.parseWebhook(options.body, {
      'x-signature': options.signatureHeader ?? '',
      ...options.query,
    });

    if (!parsed.providerPaymentId) {
      throw new BadRequestException('Webhook sem providerPaymentId.');
    }

    const aggregateId = parsed.providerEventId || parsed.providerPaymentId;
    const existing = await prisma.outboxEvent.findFirst({
      where: {
        type: 'payments.webhook',
        aggregateId,
        status: { in: ['PENDING', 'PROCESSED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return { received: true, valid: true, duplicate: true, outboxEventId: existing.id };
    }

    const outboxEvent = await prisma.outboxEvent.create({
      data: {
        aggregateType: 'PAYMENT_WEBHOOK_RECEIVED',
        aggregateId,
        type: 'payments.webhook',
        status: 'PENDING',
        nextRunAt: new Date(),
        requestId: options.requestId ?? null,
        payload: {
          provider: parsed.provider,
          providerPaymentId: parsed.providerPaymentId,
          providerStatus: parsed.providerStatus,
          providerEventId: parsed.providerEventId,
          status: parsed.status,
          body: options.body,
          query: options.query,
          rawBody: options.rawBody.toString('utf8'),
          receivedAt: new Date().toISOString(),
        },
      },
    });

    return { received: true, valid: true, duplicate: false, outboxEventId: outboxEvent.id };
  }

  async processCheckout(dto: CheckoutPaymentDto): Promise<any> {
    const tickets = await this.loadCheckoutTickets(dto);
    const user = await this.upsertBuyer(dto);
    await this.attachBuyerToTickets(tickets, user, dto);

    const refreshedTickets = await prisma.ticket.findMany({
      where: { id: { in: tickets.map((ticket) => ticket.id) } },
      include: { batch: { include: { event: true } }, buyer: true },
    });

    const amount = refreshedTickets.reduce((sum, ticket) => sum + Number(ticket.price), 0);
    const eventId = refreshedTickets[0].eventId || refreshedTickets[0].batch?.eventId;
    const order = await this.createOrUpdateOrder(dto, refreshedTickets, user.id, amount, eventId);
    const idempotencyKey = crypto.randomUUID();
    const paymentMethod = dto.paymentMethod.method === 'pix' ? 'PIX' : 'CREDIT_CARD';
    const paymentInput = {
      method: dto.paymentMethod.method,
      token: dto.paymentMethod.method === 'credit_card' ? dto.paymentMethod.token : undefined,
      installments: dto.paymentMethod.method === 'credit_card' ? dto.paymentMethod.installments : 1,
      issuerId: dto.paymentMethod.method === 'credit_card' ? dto.paymentMethod.issuerId : undefined,
      email: dto.paymentMethod.method === 'credit_card' ? dto.paymentMethod.email : dto.email,
      idempotencyKey,
    } as const;

    let providerResult: ProviderPaymentResult;
    try {
      providerResult = await this.provider.createPayment(
        {
          id: order.id,
          eventId,
          buyerId: user.id,
          amount,
          description: `Ingressos: ${refreshedTickets.length}x`,
          ticketIds: refreshedTickets.map((ticket) => ticket.id),
        },
        paymentInput
      );
    } catch (error) {
      if (error instanceof TemporaryProviderFailure) {
        const failedPayment = await this.createPaymentRecord({
          order,
          tickets: refreshedTickets,
          status: 'FAILED',
          paymentMethod,
          amount,
          installments: Number(paymentInput.installments) || 1,
          providerResult: {
            provider: this.provider.name,
            providerPaymentId: `mock-provider-error-${idempotencyKey}`,
            providerStatus: 'temporary_error',
            status: 'FAILED',
            idempotencyKey,
            rawPayload: { temporaryFailure: true, message: error.message, orderId: order.id, paymentInput },
          },
        });
        await prisma.outboxEvent.create({
          data: {
            aggregateType: 'PAYMENT_CREATE_RETRY',
            aggregateId: failedPayment.id,
            type: 'payments.recoverPending',
            status: 'PENDING',
            nextRunAt: new Date(),
            payload: { paymentId: failedPayment.id, reason: 'TEMPORARY_PROVIDER_FAILURE' },
          },
        });
        await this.auditPaymentTransition(failedPayment.id, null, 'FAILED', 'PAYMENT_PROVIDER_TEMPORARY_FAILURE', {
          orderId: order.id,
          idempotencyKey,
        });
        throw new ServiceUnavailableException('Falha temporária no provedor de pagamento. O pagamento será reprocessado.');
      }
      throw error;
    }

    const payment = await this.createPaymentRecord({
      order,
      tickets: refreshedTickets,
      status: providerResult.status,
      paymentMethod,
      amount,
      installments: Number(paymentInput.installments) || 1,
      providerResult,
    });

    return this.applyPaymentStatus({
      payment,
      tickets: refreshedTickets,
      status: providerResult.status,
      providerResult,
      buyerName: dto.buyerName,
      buyerEmail: dto.email,
      requestId: undefined,
    });
  }

  private async loadCheckoutTickets(dto: CheckoutPaymentDto) {
    let ticketIds = dto.ticketId ? dto.ticketId.split(',') : [];
    const tickets = await prisma.ticket.findMany({
      where: dto.reservationId ? { reservationId: dto.reservationId } : { id: { in: ticketIds } },
      include: { batch: { include: { event: true } } },
    });
    ticketIds = tickets.map((ticket) => ticket.id);

    if (ticketIds.length === 0) {
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

    return tickets;
  }

  private async upsertBuyer(dto: CheckoutPaymentDto) {
    return prisma.user.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        name: dto.buyerName,
        password: crypto.randomBytes(8).toString('hex'),
        role: 'USER',
      },
      update: { name: dto.buyerName },
    });
  }

  private async attachBuyerToTickets(tickets: any[], user: any, dto: CheckoutPaymentDto) {
    for (let i = 0; i < tickets.length; i++) {
      const holder = dto.holders?.[i];
      await prisma.ticket.update({
        where: { id: tickets[i].id },
        data: {
          buyerCpf: dto.buyerCpf,
          buyerId: user.id,
          holderName: holder?.name ?? dto.buyerName,
          holderCpf: holder?.cpf ?? dto.buyerCpf,
        },
      });
    }
  }

  private async createOrUpdateOrder(dto: CheckoutPaymentDto, tickets: any[], buyerId: string, amount: number, eventId: string) {
    const existing = dto.reservationId
      ? await (prisma as any).order.findFirst({ where: { reservationId: dto.reservationId } })
      : null;

    const data = {
      reservationId: dto.reservationId ?? tickets[0].reservationId ?? null,
      eventId,
      buyerId,
      status: 'PROCESSING',
      grossAmount: amount,
      discountAmount: 0,
      netAmount: amount,
    };

    const order = existing
      ? await (prisma as any).order.update({ where: { id: existing.id }, data })
      : await (prisma as any).order.create({ data });

    await prisma.ticket.updateMany({
      where: { id: { in: tickets.map((ticket) => ticket.id) } },
      data: { orderId: order.id },
    });

    return order;
  }

  private async createPaymentRecord(input: {
    order: any;
    tickets: any[];
    status: InternalPaymentStatus;
    paymentMethod: 'PIX' | 'CREDIT_CARD';
    amount: number;
    installments: number;
    providerResult: ProviderPaymentResult;
  }) {
    return prisma.payment.create({
      data: {
        eventId: input.order.eventId,
        buyerId: input.order.buyerId,
        orderId: input.order.id,
        method: input.paymentMethod,
        status: input.status as any,
        amount: input.amount,
        installments: input.installments,
        provider: input.providerResult.provider,
        providerPaymentId: input.providerResult.providerPaymentId,
        providerStatus: input.providerResult.providerStatus,
        providerEventId: input.providerResult.providerEventId ?? null,
        idempotencyKey: input.providerResult.idempotencyKey,
        rawPayload: input.providerResult.rawPayload as any,
        rawResponse: input.providerResult as any,
        paidAt: input.status === 'APPROVED' ? new Date() : null,
        tickets: input.status === 'REJECTED' || input.status === 'EXPIRED' || input.status === 'CANCELLED'
          ? undefined
          : { connect: input.tickets.map((ticket) => ({ id: ticket.id })) },
      },
    });
  }

  private async applyPaymentStatus(input: {
    payment: any;
    tickets: any[];
    status: InternalPaymentStatus;
    providerResult: ProviderPaymentResult;
    buyerName?: string;
    buyerEmail?: string;
    requestId?: string | null;
  }) {
    if (input.status === 'APPROVED') {
      return this.approvePayment(input);
    }

    if (input.status === 'PENDING') {
      return this.markPaymentPending(input);
    }

    if (FINAL_RELEASE_STATUSES.includes(input.status)) {
      await this.releasePayment(input);
      throw new BadRequestException(input.status === 'EXPIRED' ? 'O pagamento expirou.' : 'O pagamento foi recusado pela instituição financeira ou cancelado.');
    }

    return { status: input.status.toLowerCase(), paymentId: input.payment.providerPaymentId };
  }

  private async approvePayment(input: {
    payment: any;
    tickets: any[];
    status: InternalPaymentStatus;
    providerResult: ProviderPaymentResult;
    buyerName?: string;
    buyerEmail?: string;
    requestId?: string | null;
  }) {
    const finalStatuses: Array<{ id: string; finalStatus: string }> = [];

    for (const ticket of input.tickets) {
      if (ticket.status === 'VALID') {
        finalStatuses.push({ id: ticket.id, finalStatus: 'VALID' });
        continue;
      }

      const activeCpf = ticket.holderCpf || ticket.buyerCpf;
      const signature = this.ticketCryptoService.generateSignature(ticket.id, activeCpf, ticket.batchId);
      const newStatus = ticket.meiaEntrada ? 'PENDING_VALIDATION' : 'VALID';

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: newStatus as any,
          hmacSignature: signature,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await recordTicketStatusHistory({
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: newStatus as any,
        reason: 'PAYMENT_APPROVED',
        actorId: ticket.buyerId,
        requestId: input.requestId ?? undefined,
        metadata: { paymentId: input.payment.id, providerPaymentId: input.providerResult.providerPaymentId, orderId: input.payment.orderId },
      });

      await this.auditService.record({
        actorId: ticket.buyerId,
        actorRole: 'USER',
        action: 'TICKET_STATUS_CHANGED',
        entityType: 'Ticket',
        entityId: ticket.id,
        before: { status: ticket.status },
        after: { status: newStatus },
        metadata: { paymentId: input.payment.id, providerPaymentId: input.providerResult.providerPaymentId, orderId: input.payment.orderId },
        requestId: input.requestId,
      });

      await this.fluxEngine.releaseTicketLock(ticket.batchId, ticket.buyerId, ticket.id);
      finalStatuses.push({ id: ticket.id, finalStatus: newStatus });
    }

    await (prisma as any).order.update({ where: { id: input.payment.orderId }, data: { status: 'PAID' } });
    const order = await (prisma as any).order.findUnique({ where: { id: input.payment.orderId } });
    if (order?.reservationId) {
      await (prisma as any).reservation.update({ where: { id: order.reservationId }, data: { status: 'CONVERTED' } }).catch(() => undefined);
    }
    await prisma.payment.update({
      where: { id: input.payment.id },
      data: { status: 'APPROVED', paidAt: new Date(), tickets: { connect: input.tickets.map((ticket) => ({ id: ticket.id })) } },
    });

    await this.recordSales(input, finalStatuses);
    await this.auditPaymentTransition(input.payment.id, input.payment.status, 'APPROVED', 'PAYMENT_APPROVED', {
      orderId: input.payment.orderId,
      providerPaymentId: input.providerResult.providerPaymentId,
    });

    return {
      status: 'approved',
      ticketId: input.tickets.map((ticket) => ticket.id).join(','),
      isStudent: input.tickets.some((ticket) => ticket.meiaEntrada === true),
      paymentId: input.providerResult.providerPaymentId,
    };
  }

  private async markPaymentPending(input: {
    payment: any;
    tickets: any[];
    providerResult: ProviderPaymentResult;
    requestId?: string | null;
  }) {
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    for (const ticket of input.tickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'PENDING_PAYMENT', expiresAt: newExpiresAt },
      });
      await recordTicketStatusHistory({
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: 'PENDING_PAYMENT',
        reason: 'PAYMENT_PENDING',
        actorId: ticket.buyerId,
        requestId: input.requestId ?? undefined,
        metadata: { paymentId: input.payment.id, providerPaymentId: input.providerResult.providerPaymentId, orderId: input.payment.orderId },
      });
      await this.fluxEngine.extendTicketLock(ticket.buyerId, ticket.id, ticket.batchId, 900);
    }

    await this.auditPaymentTransition(input.payment.id, null, 'PENDING', 'PAYMENT_PENDING', {
      orderId: input.payment.orderId,
      providerPaymentId: input.providerResult.providerPaymentId,
    });

    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'PAYMENT_PENDING',
        aggregateId: input.payment.id,
        type: 'payments.recoverPending',
        status: 'PENDING',
        nextRunAt: new Date(Date.now() + 60 * 1000),
        requestId: input.requestId ?? null,
        payload: { paymentId: input.payment.id, providerPaymentId: input.providerResult.providerPaymentId },
      },
    });

    return {
      status: 'pending',
      ticketId: input.tickets.map((ticket) => ticket.id).join(','),
      qrCode: input.providerResult.qrCode,
      qrCodeBase64: input.providerResult.qrCodeBase64,
      paymentId: input.providerResult.providerPaymentId,
    };
  }

  private async releasePayment(input: {
    payment: any;
    tickets: any[];
    status: InternalPaymentStatus;
    providerResult: ProviderPaymentResult;
    requestId?: string | null;
  }) {
    for (const ticket of input.tickets) {
      if (ticket.status === 'REVOKED' || ticket.status === 'VALID' || ticket.status === 'CONSUMED') {
        continue;
      }

      await this.fluxEngine.releaseTicketLock(ticket.batchId, ticket.buyerId, ticket.id);
      await prisma.ticketBatch.update({
        where: { id: ticket.batchId },
        data: { availableQuantity: { increment: 1 } },
      });
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'REVOKED', expiresAt: new Date() },
      });
      await recordTicketStatusHistory({
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: 'REVOKED',
        reason: `PAYMENT_${input.status}`,
        actorId: ticket.buyerId,
        requestId: input.requestId ?? undefined,
        metadata: { paymentId: input.payment.id, providerPaymentId: input.providerResult.providerPaymentId, orderId: input.payment.orderId },
      }).catch(() => undefined);
      await prisma.outboxEvent.create({
        data: {
          aggregateType: 'WAITLIST_STOCK_RETURNED',
          aggregateId: ticket.batchId,
          type: 'waitlist.invite',
          status: 'PENDING',
          nextRunAt: new Date(),
          requestId: input.requestId ?? null,
          payload: { batchId: ticket.batchId, eventId: ticket.eventId, source: `PAYMENT_${input.status}` },
        },
      });
    }

    await prisma.payment.update({
      where: { id: input.payment.id },
      data: {
        status: input.status as any,
        providerStatus: input.providerResult.providerStatus,
        rawPayload: input.providerResult.rawPayload as any,
      },
    });
    await (prisma as any).order.update({ where: { id: input.payment.orderId }, data: { status: input.status === 'EXPIRED' ? 'EXPIRED' : 'FAILED' } }).catch(() => undefined);
    const order = await (prisma as any).order.findUnique({ where: { id: input.payment.orderId } }).catch(() => null);
    if (order?.reservationId) {
      await (prisma as any).reservation.update({ where: { id: order.reservationId }, data: { status: input.status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED' } }).catch(() => undefined);
    }

    await this.auditPaymentTransition(input.payment.id, input.payment.status, input.status, `PAYMENT_${input.status}`, {
      orderId: input.payment.orderId,
      providerPaymentId: input.providerResult.providerPaymentId,
    });
  }

  private async recordSales(input: { payment: any; tickets: any[]; buyerName?: string; buyerEmail?: string }, finalStatuses: Array<{ id: string; finalStatus: string }>) {
    const payment = await prisma.payment.findUnique({ where: { id: input.payment.id } });
    for (const ticket of input.tickets) {
      await prisma.saleLog.create({
        data: {
          eventId: ticket.eventId || ticket.batch?.eventId,
          ticketId: ticket.id,
          batchId: ticket.batchId,
          paymentId: input.payment.id,
          buyerName: input.buyerName || ticket.buyer?.name || 'Unknown',
          buyerEmail: input.buyerEmail || ticket.buyer?.email || '',
          holderName: ticket.holderName || null,
          batchName: ticket.batch?.name || '',
          eventTitle: ticket.batch?.event?.title || '',
          price: ticket.price,
          channel: 'ONLINE',
          method: payment?.method || 'PIX',
          status: (finalStatuses.find((status) => status.id === ticket.id)?.finalStatus || 'VALID') as any,
        },
      }).catch((error) => this.logger.warn('[SALE LOG] Could not create SaleLog record', error));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailySalesSnapshot.upsert({
      where: { eventId_date: { eventId: input.tickets[0].eventId, date: today } },
      create: { eventId: input.tickets[0].eventId, date: today, revenue: Number(input.payment.amount), ticketsSold: input.tickets.length },
      update: { revenue: { increment: Number(input.payment.amount) }, ticketsSold: { increment: input.tickets.length } },
    }).catch((error) => this.logger.warn('[SNAPSHOT] Could not upsert DailySalesSnapshot', error));
  }

  private async auditPaymentTransition(paymentId: string, fromStatus: string | null, toStatus: string, reason: string, metadata?: unknown) {
    await this.auditService.record({
      actorRole: 'SYSTEM',
      action: 'PAYMENT_STATUS_CHANGED',
      entityType: 'Payment',
      entityId: paymentId,
      before: fromStatus ? { status: fromStatus } : undefined,
      after: { status: toStatus },
      reason,
      metadata,
    });
  }

  async handleWebhookNotification(providerPaymentId: string): Promise<void> {
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId },
      include: { tickets: { include: { batch: { include: { event: true } }, buyer: true } } },
    });

    if (!payment) {
      this.logger.warn(`[PAYMENTS WEBHOOK] Pagamento ${providerPaymentId} não encontrado.`);
      return;
    }

    const providerResult = await this.provider.getPaymentStatus(providerPaymentId);
    if (payment.status === providerResult.status) return;

    await this.applyPaymentStatus({
      payment,
      tickets: payment.tickets,
      status: providerResult.status,
      providerResult,
    }).catch((error) => {
      if (providerResult.status !== 'REJECTED' && providerResult.status !== 'EXPIRED') throw error;
    });
  }
}
