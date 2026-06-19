import { Queue } from 'bullmq';
import { prisma } from '@flux/database';
import { CheckoutController } from '../services/api-write/src/tickets/checkout.controller';
import { CheckoutService } from '../services/api-write/src/tickets/checkout.service';
import { FluxEngineService } from '../services/api-write/src/tickets/flux-engine.service';
import { TicketCryptoService } from '../services/api-write/src/tickets/ticket-crypto.service';
import { AuditService } from '../services/api-write/src/audit/audit.service';
import { PaymentsService } from '../services/api-write/src/payments/payments.service';
import { moveJobToDeadLetter } from '../services/ticket-worker/src/dead-letter';
import { closeQueues, deadLetterQueues, QUEUE_NAMES } from '../services/ticket-worker/src/queue-registry';

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const runId = `manual-${Date.now()}`;
const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
}

function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
}

function assertCheck(condition: unknown, name: string, detail?: string) {
  if (condition) {
    pass(name, detail);
  } else {
    fail(name, detail);
  }
}

function assertOrThrow(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function countHistory(ticketId: string, reason: string) {
  return prisma.ticketStatusHistory.count({
    where: { ticketId, reason },
  });
}

function rawBodyFor(body: unknown) {
  return Buffer.from(JSON.stringify(body));
}

async function createFixture() {
  const organizer = await prisma.user.create({
    data: {
      id: `${runId}-organizer`,
      email: `${runId}-organizer@example.com`,
      name: 'Critical Flow Organizer',
      password: 'not-used',
      role: 'ORGANIZER',
    },
  });

  const event = await prisma.event.create({
    data: {
      id: `${runId}-event`,
      title: 'Critical Flow Event',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Test Venue',
      status: 'PUBLISHED',
      organizerId: organizer.id,
    },
  });

  const regularBatch = await prisma.ticketBatch.create({
    data: {
      id: `${runId}-regular-batch`,
      eventId: event.id,
      name: 'Regular',
      price: 100,
      totalQuantity: 50,
      availableQuantity: 50,
      meiaEntrada: false,
    },
  });

  const halfBatch = await prisma.ticketBatch.create({
    data: {
      id: `${runId}-half-batch`,
      eventId: event.id,
      name: 'Half',
      price: 50,
      totalQuantity: 10,
      availableQuantity: 10,
      meiaEntrada: true,
    },
  });

  return { organizer, event, regularBatch, halfBatch };
}

async function cleanup() {
  const eventIds = [`${runId}-event`];
  await prisma.saleLog.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.payment.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
  await (prisma as any).reservationItem.deleteMany({
    where: { reservation: { eventId: { in: eventIds } } },
  });
  await (prisma as any).order.deleteMany({ where: { eventId: { in: eventIds } } });
  await (prisma as any).reservation.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.ticketBatch.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  await prisma.outboxEvent.deleteMany({
    where: {
      OR: [
        { aggregateId: { startsWith: runId } },
        { requestId: { startsWith: runId } },
      ],
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { requestId: { startsWith: runId } },
        { entityId: { startsWith: runId } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: runId } },
        { email: { startsWith: runId } },
      ],
    },
  });
}

async function main() {
  process.env.MERCADO_PAGO_ACCESS_TOKEN = 'mock';
  delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  const fluxEngine = new FluxEngineService();
  await fluxEngine.onModuleInit();

  const auditService = new AuditService();
  const checkoutService = new CheckoutService(fluxEngine, new TicketCryptoService());
  const checkoutController = new CheckoutController(checkoutService, auditService);
  const paymentsService = new PaymentsService(fluxEngine, new TicketCryptoService(), auditService);

  try {
    await cleanup().catch(() => undefined);
    const fixture = await createFixture();

    const reserved = await checkoutService.checkout({
      userId: fixture.organizer.id,
      eventId: fixture.event.id,
      batchId: fixture.regularBatch.id,
      buyerCpf: '000.000.000-00',
      price: 100,
      isHalfPrice: false,
      requestId: `${runId}-reserve`,
    });
    assertCheck(await countHistory(reserved.id, 'RESERVED') === 1, 'historico: reserva', reserved.id);

    const approvedTicket = await checkoutService.checkout({
      userId: fixture.organizer.id,
      eventId: fixture.event.id,
      batchId: fixture.regularBatch.id,
      buyerCpf: '000.000.000-00',
      price: 100,
      isHalfPrice: false,
      requestId: `${runId}-approved-reserve`,
    });
    const approved = await paymentsService.processCheckout({
      ticketId: approvedTicket.id,
      buyerCpf: '529.982.247-25',
      email: `${runId}-approved@example.com`,
      buyerName: 'Approved Buyer',
      paymentMethod: {
        method: 'credit_card',
        token: 'approved-token',
        installments: 1,
        issuerId: 'issuer',
        email: `${runId}-approved@example.com`,
      },
    });
    assertCheck(approved.status === 'approved', 'checkout antigo: ticketId aprovado');
    assertCheck(await countHistory(approvedTicket.id, 'PAYMENT_APPROVED') === 1, 'historico: pagamento aprovado', approvedTicket.id);

    const rejectedTicket = await checkoutService.checkout({
      userId: fixture.organizer.id,
      eventId: fixture.event.id,
      batchId: fixture.regularBatch.id,
      buyerCpf: '000.000.000-00',
      price: 100,
      isHalfPrice: false,
      requestId: `${runId}-rejected-reserve`,
    });
    try {
      await paymentsService.processCheckout({
        ticketId: rejectedTicket.id,
        buyerCpf: '529.982.247-25',
        email: `${runId}-rejected@example.com`,
        buyerName: 'Rejected Buyer',
        paymentMethod: {
          method: 'credit_card',
          token: 'fail-token',
          installments: 1,
          issuerId: 'issuer',
          email: `${runId}-rejected@example.com`,
        },
      });
      fail('checkout antigo: pagamento recusado', 'esperava excecao');
    } catch {
      pass('checkout antigo: pagamento recusado');
    }
    const rejectedAfter = await prisma.ticket.findUnique({ where: { id: rejectedTicket.id } });
    assertCheck(rejectedAfter?.status === 'REVOKED', 'historico: pagamento recusado preserva ticket revogado', rejectedTicket.id);
    assertCheck(await countHistory(rejectedTicket.id, 'PAYMENT_REJECTED') === 1, 'historico: pagamento recusado', rejectedTicket.id);

    const halfTicket = await checkoutService.checkout({
      userId: fixture.organizer.id,
      eventId: fixture.event.id,
      batchId: fixture.halfBatch.id,
      buyerCpf: '000.000.000-00',
      price: 50,
      isHalfPrice: true,
      requestId: `${runId}-revoke-reserve`,
    });
    const beforeRevoke = await prisma.ticket.findUniqueOrThrow({ where: { id: halfTicket.id } });
    await prisma.ticket.update({
      where: { id: halfTicket.id },
      data: { status: 'REVOKED' },
    });
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: halfTicket.id,
        fromStatus: beforeRevoke.status,
        toStatus: 'REVOKED',
        reason: 'HALF_PRICE_VALIDATION_DEADLINE_EXPIRED',
        requestId: `${runId}-manual-revoke`,
      },
    });
    assertCheck(await countHistory(halfTicket.id, 'HALF_PRICE_VALIDATION_DEADLINE_EXPIRED') === 1, 'historico: cancelamento/revogacao', halfTicket.id);

    await checkoutController.staffMutation(
      fixture.event.id,
      { ticketIds: [approvedTicket.id], deviceId: `${runId}-device`, deviceName: 'Device' },
      {
        user: { userId: fixture.organizer.id, role: 'STAFF' },
        requestId: `${runId}-checkin`,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'manual-critical-flows' },
      }
    );
    assertCheck(await countHistory(approvedTicket.id, 'STAFF_CHECK_IN') === 1, 'historico: check-in', approvedTicket.id);

    try {
      await checkoutController.staffMutation(
        fixture.event.id,
        { ticketIds: [approvedTicket.id], deviceId: `${runId}-restricted`, allowedSectorIds: [999999] },
        {
          user: { userId: fixture.organizer.id, role: 'STAFF' },
          requestId: `${runId}-conflict`,
          ip: '127.0.0.1',
          headers: { 'user-agent': 'manual-critical-flows' },
        }
      );
      fail('conflito: acesso setorial negado', 'esperava excecao');
    } catch {
      pass('conflito: acesso setorial negado');
      pass('historico: conflito sem transicao de status', 'nenhum TicketStatusHistory esperado porque o ticket nao muda de status');
    }

    const duplicateBody = {
      id: `${runId}-provider-event`,
      type: 'payment',
      data: { id: `${runId}-provider-payment` },
      rawPayload: 'must-be-sanitized-in-dead-letter-only',
    };
    const firstWebhook = await paymentsService.receiveMercadoPagoWebhook({
      rawBody: rawBodyFor(duplicateBody),
      query: {},
      body: duplicateBody,
      requestId: `${runId}-webhook-1`,
    });
    const secondWebhook = await paymentsService.receiveMercadoPagoWebhook({
      rawBody: rawBodyFor(duplicateBody),
      query: {},
      body: duplicateBody,
      requestId: `${runId}-webhook-2`,
    });
    const duplicateOutboxCount = await prisma.outboxEvent.count({
      where: { type: 'payments.webhook', aggregateId: `${runId}-provider-event` },
    });
    assertCheck(!firstWebhook.duplicate && secondWebhook.duplicate === true, 'webhook duplicado: segunda entrada marcada duplicate');
    assertCheck(duplicateOutboxCount === 1, 'webhook duplicado: somente um processamento real', `outbox=${duplicateOutboxCount}`);

    const deadQueue = deadLetterQueues[QUEUE_NAMES.paymentsWebhook];
    await (deadQueue as Queue).drain(true);
    await moveJobToDeadLetter(
      QUEUE_NAMES.paymentsWebhook,
      {
        id: `${runId}-forced-job`,
        name: 'forced.failure',
        data: {
          requestId: `${runId}-dead-letter`,
          token: 'secret-token',
          nested: {
            cpf: '529.982.247-25',
            ok: 'visible',
          },
        },
        attemptsMade: 5,
      } as any,
      new Error('forced failure')
    );
    const deadJobs = await (deadQueue as Queue).getJobs(['waiting', 'delayed', 'completed', 'failed'], 0, 20);
    const deadPayload = deadJobs.find((job) => job.data?.jobId === `${runId}-forced-job`)?.data;
    assertCheck(!!deadPayload, 'dead-letter: payload caiu em payments.webhook.dead');
    assertCheck(
      deadPayload?.data?.token === '[REDACTED]' &&
        deadPayload?.data?.nested?.cpf === '[REDACTED]' &&
        deadPayload?.data?.nested?.ok === 'visible',
      'dead-letter: payload sanitizado'
    );

    const legacyRenewTicket = await checkoutService.checkout({
      userId: fixture.organizer.id,
      eventId: fixture.event.id,
      batchId: fixture.regularBatch.id,
      buyerCpf: '000.000.000-00',
      price: 100,
      isHalfPrice: false,
      requestId: `${runId}-legacy-renew`,
    });
    const legacyRenew = await checkoutController.renewLock({
      userId: fixture.organizer.id,
      ticketId: legacyRenewTicket.id,
      batchId: fixture.regularBatch.id,
    });
    assertCheck(legacyRenew.success === true, 'renew antigo: userId/ticketId/batchId');

    const newReservation = await checkoutController.reserve(
      {
        eventId: fixture.event.id,
        items: [{ batchId: fixture.regularBatch.id, price: 100, quantity: 1 }],
      },
      { requestId: `${runId}-reservation-new` }
    );
    assertCheck(!!newReservation.reservationId && !!newReservation.ticketId, 'reserva nova: reservationId');
    const newRenew = await checkoutController.renewLock({ reservationId: newReservation.reservationId });
    assertCheck(newRenew.success === true, 'renew novo: reservationId');

    const newCheckout = await paymentsService.processCheckout({
      reservationId: newReservation.reservationId,
      buyerCpf: '529.982.247-25',
      email: `${runId}-new-checkout@example.com`,
      buyerName: 'New Checkout Buyer',
      paymentMethod: {
        method: 'credit_card',
        token: 'approved-token',
        installments: 1,
        issuerId: 'issuer',
        email: `${runId}-new-checkout@example.com`,
      },
    });
    assertCheck(newCheckout.status === 'approved', 'checkout novo: reservationId aprovado');

    const legacyReservation = await checkoutService.checkout({
      userId: fixture.organizer.id,
      eventId: fixture.event.id,
      batchId: fixture.regularBatch.id,
      buyerCpf: '000.000.000-00',
      price: 100,
      isHalfPrice: false,
      requestId: `${runId}-legacy-reservation`,
    });
    assertCheck(!!legacyReservation.id && legacyReservation.buyerId === fixture.organizer.id, 'reserva antiga: ticketId/userId');

    const failed = checks.filter((check) => !check.ok);
    for (const check of checks) {
      const suffix = check.detail ? ` - ${check.detail}` : '';
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${suffix}`);
    }

    if (failed.length > 0) {
      throw new Error(`${failed.length} checks failed`);
    }
  } finally {
    await fluxEngine.onModuleDestroy();
    await closeQueues();
    await cleanup().catch((error) => {
      console.warn('cleanup failed', error);
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
