import { prisma } from '@flux/database';
import { CheckoutController } from '../services/api-write/src/tickets/checkout.controller';
import { CheckoutService } from '../services/api-write/src/tickets/checkout.service';
import { FluxEngineService } from '../services/api-write/src/tickets/flux-engine.service';
import { TicketCryptoService } from '../services/api-write/src/tickets/ticket-crypto.service';
import { AuditService } from '../services/api-write/src/audit/audit.service';
import { StaffPlatformService } from '../services/api-write/src/tickets/staff-platform.service';
import * as crypto from 'crypto';

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const runId = `manual-6b-${Date.now()}`;
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

async function createFixture() {
  const organizer = await prisma.user.create({
    data: {
      id: `${runId}-organizer`,
      email: `${runId}-organizer@example.com`,
      name: 'Phase 6B Organizer',
      password: 'not-used',
      role: 'ORGANIZER',
    },
  });

  const event = await prisma.event.create({
    data: {
      id: `${runId}-event`,
      title: 'Phase 6B Event',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Within 7 days (Hero Card eligible!)
      location: '6B Venue',
      status: 'PUBLISHED',
      organizerId: organizer.id,
    },
  });

  const batch = await prisma.ticketBatch.create({
    data: {
      id: `${runId}-batch`,
      eventId: event.id,
      name: 'Regular',
      price: 150,
      totalQuantity: 10,
      availableQuantity: 10,
      sectorId: 1,
      sectorName: 'Main Floor',
      meiaEntrada: false,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      id: `${runId}-buyer`,
      email: `${runId}-buyer@example.com`,
      name: 'Buyer 6B',
      password: 'not-used',
      role: 'USER',
    },
  });

  return { organizer, event, batch, buyer };
}

async function main() {
  console.log('--- Starting Phase 6B Critical Flow Validations ---');
  
  const fixture = await createFixture();
  
  // Instancia serviços para o teste
  const auditService = new AuditService();
  const ticketCryptoService = new TicketCryptoService();
  const fluxEngine = new FluxEngineService();
  await fluxEngine.onModuleInit();
  const checkoutService = new CheckoutService(fluxEngine, ticketCryptoService);
  const staffPlatformService = new StaffPlatformService(auditService, fluxEngine, ticketCryptoService);
  const controller = new CheckoutController(checkoutService, auditService, staffPlatformService, ticketCryptoService);

  // 1. Issue ticket & approve payment to create a VALID ticket with signature
  console.log('\nTesting: Payment Approved -> Ticket Issued & Signed');
  const ticketId = crypto.randomUUID();
  const ticket = await prisma.ticket.create({
    data: {
      id: ticketId,
      eventId: fixture.event.id,
      batchId: fixture.batch.id,
      buyerId: fixture.buyer.id,
      buyerCpf: '111.222.333-44',
      price: 150,
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() + 180 * 1000),
    },
  });

  await checkoutService.approveTicketPayment(ticket.id);
  const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
  
  assertCheck(updatedTicket?.status === 'VALID', 'Ticket status updated to VALID');
  assertCheck(!!updatedTicket?.hmacSignature, 'Ticket signature generated and saved');

  // 2. Validate QR Engine details (Centralized Ticket Engine)
  console.log('\nTesting: Centralized Ticket Engine QR payload generation');
  const qrPayload = ticketCryptoService.generateQrPayload(ticket.id, 1);
  assertCheck(qrPayload.ticketId === ticket.id, 'Payload contains correct ticketId');
  assertCheck(qrPayload.version === 1, 'Payload contains correct version');
  assertCheck(qrPayload.signature === updatedTicket?.hmacSignature, 'Payload signature matches database signature');

  // 3. Pre-DB Signature Verification
  console.log('\nTesting: Signature check before database lookup');
  const isSignatureValid = ticketCryptoService.verifySignature(ticket.id, 1, qrPayload.signature);
  assertCheck(isSignatureValid === true, 'Valid signature verified successfully');

  const isTamperedSignatureValid = ticketCryptoService.verifySignature(ticket.id, 1, 'tampered-signature-12345');
  assertCheck(isTamperedSignatureValid === false, 'Invalid signature rejected before DB lookup');

  // 4. Online Validation Endpoint
  console.log('\nTesting: Online QR validation API');
  const reqMock = { user: { role: 'STAFF', userId: 'staff-1' }, requestId: 'req-validate-1' };
  
  // Rejeita assinatura inválida
  try {
    await controller.validateTicket(ticket.id, { signature: 'wrong-sig', version: 1 }, reqMock);
    fail('Online validation allowed wrong signature');
  } catch (err: any) {
    pass('Online validation rejected invalid signature', err.message);
  }

  // Valida com sucesso
  const validationRes = await controller.validateTicket(ticket.id, { signature: qrPayload.signature, version: 1 }, reqMock);
  assertCheck(validationRes.success === true, 'Online validation returns success for authentic ticket');

  // Verifica se atualizou o status e logs
  const consumedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
  assertCheck(consumedTicket?.status === 'CONSUMED', 'Ticket status updated to CONSUMED');
  assertCheck(!!consumedTicket?.checkedInAt, 'Ticket checkedInAt timestamp populated');

  // Verifica logs correspondentes
  const checkinRecord = await prisma.checkin.findFirst({ where: { ticketId: ticket.id } });
  assertCheck(!!checkinRecord, 'Checkin record created');
  assertCheck(checkinRecord?.status === 'ACCEPTED', 'Checkin record status is ACCEPTED');

  const historyRecord = await prisma.ticketStatusHistory.findFirst({ where: { ticketId: ticket.id, toStatus: 'CONSUMED' } });
  assertCheck(!!historyRecord, 'TicketStatusHistory log created');

  const auditRecord = await prisma.auditLog.findFirst({ where: { entityId: ticket.id, action: 'TICKET_CHECKED_IN' } });
  assertCheck(!!auditRecord, 'AuditLog created');

  // 5. Rejeita Check-in Duplicado
  console.log('\nTesting: Duplicate scan prevention');
  try {
    await controller.validateTicket(ticket.id, { signature: qrPayload.signature, version: 1 }, reqMock);
    fail('Duplicate online validation allowed');
  } catch (err: any) {
    pass('Duplicate online validation rejected correctly', err.message);
  }

  // 6. Sincronização Offline Idempotente
  console.log('\nTesting: Idempotent offline synchronization');
  // Cria outro ingresso para o teste offline
  const offlineTicketId = crypto.randomUUID();
  await prisma.ticket.create({
    data: {
      id: offlineTicketId,
      eventId: fixture.event.id,
      batchId: fixture.batch.id,
      buyerId: fixture.buyer.id,
      buyerCpf: '111.222.333-44',
      price: 150,
      status: 'VALID',
      hmacSignature: ticketCryptoService.generateSignature(offlineTicketId, 1),
      expiresAt: new Date(Date.now() + 180 * 1000),
    },
  });

  const offlineId = `offline-${offlineTicketId}-123`;
  const offlinePayload = {
    ticketId: offlineTicketId,
    offlineId,
    scannedAt: new Date().toISOString(),
    hmacSignature: ticketCryptoService.generateSignature(offlineTicketId, 1),
    sectorId: 1,
    version: 1,
  };

  const staffReqMock = { user: { role: 'STAFF', userId: 'staff-2' }, requestId: 'req-sync-1' };

  // Primeiro upload do checkin offline
  const firstSync = await staffPlatformService.syncCheckins({
    eventId: fixture.event.id,
    checkins: [offlinePayload],
    deviceId: 'device-pwa-1',
    deviceName: 'PWA Gate 1',
    request: staffReqMock,
  });

  assertCheck(firstSync.success === true, 'Offline checkin sync succeeds');
  assertCheck(firstSync.accepted === 1, 'First upload accepted');

  // Segundo upload idêntico (duplicado/idempotente)
  const secondSync = await staffPlatformService.syncCheckins({
    eventId: fixture.event.id,
    checkins: [offlinePayload],
    deviceId: 'device-pwa-1',
    deviceName: 'PWA Gate 1',
    request: staffReqMock,
  });

  assertCheck(secondSync.success === true, 'Offline sync duplicate upload returns success');
  assertCheck(secondSync.accepted === 0, 'Duplicate upload not accepted again (no duplicate count)');
  assertCheck(secondSync.results[0].status === 'ACCEPTED', 'Returns original decision status (idempotency)');

  // 7. Wallet Mock Payload Generation
  console.log('\nTesting: Wallet integration structure generation');
  const applePass = await controller.getAppleWalletPass(ticket.id);
  assertCheck(applePass.serialNumber === ticket.id, 'Apple Wallet mock has correct serialNumber');
  assertCheck(JSON.parse(applePass.barcode.message).ticketId === ticket.id, 'Apple Wallet mock contains identical QR payload');

  const googlePass = await controller.getGoogleWalletPass(ticket.id);
  assertCheck(googlePass.id === `issuer_id.${ticket.id}`, 'Google Wallet mock has correct id');
  assertCheck(JSON.parse(googlePass.barcode.value).ticketId === ticket.id, 'Google Wallet mock contains identical QR payload');

  console.log('\n--- Final Verification Summary ---');
  let failures = 0;
  for (const c of checks) {
    if (c.ok) {
      console.log(`[PASS] ${c.name} - ${c.detail || ''}`);
    } else {
      console.error(`[FAIL] ${c.name} - ${c.detail || ''}`);
      failures++;
    }
  }

  fluxEngine.onModuleDestroy();
  if (failures === 0) {
    console.log('\nSUCCESS: All Phase 6B validation scenarios have passed successfully.');
    process.exit(0);
  } else {
    console.error(`\nFAILURE: ${failures} scenarios failed validation.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
