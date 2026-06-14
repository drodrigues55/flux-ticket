import { prisma } from '@flux/database';
import { CheckoutService } from '../../api-write/src/tickets/checkout.service';
import { FluxEngineService } from '../../api-write/src/tickets/flux-engine.service';
import { TicketCryptoService } from '../../api-write/src/tickets/ticket-crypto.service';
import Redis from 'ioredis';

async function runCryptoTest() {
  console.log('--- INICIANDO TESTE DE CRIPTOGRAFIA E EDGE SYNC ---');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
  });

  const engine = new FluxEngineService();
  await engine.onModuleInit();
  const cryptoService = new TicketCryptoService();
  const checkoutService = new CheckoutService(engine, cryptoService);

  // 1. Limpeza
  console.log('[TEST] Limpando dados...');
  await prisma.outboxEvent.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.ticketBatch.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Criar dados base
  console.log('[TEST] Criando massa de teste...');
  const user = await prisma.user.create({
    data: {
      email: 'crypto@example.com',
      password: 'password123',
      name: 'Comprador Cripto',
      role: 'USER',
    },
  });

  const event = await prisma.event.create({
    data: {
      title: 'Show Criptográfico',
      location: 'Cyber Arena',
      date: new Date(),
      organizerId: user.id,
    },
  });

  const batch = await prisma.ticketBatch.create({
    data: {
      name: 'Lote VIP Cripto',
      price: 150.00,
      totalQuantity: 5,
      availableQuantity: 5,
      sectorId: 1,
      sectorName: 'Lote VIP Cripto',
      eventId: event.id,
    },
  });

  const redisKey = `stock:{${batch.id}}`;
  await redis.set(redisKey, 5);

  // 3. Checkout (compra)
  console.log('[TEST] Executando checkout...');
  const ticket = await checkoutService.checkout({
    userId: user.id,
    eventId: event.id,
    batchId: batch.id,
    buyerCpf: '98765432100',
    price: 150.00,
    isHalfPrice: false,
  });

  // 4. Aprovação de pagamento e geração do HMAC
  console.log('[TEST] Aprovando pagamento do ingresso e gerando assinatura HMAC...');
  const approvedTicket = await checkoutService.approveTicketPayment(ticket.id);

  console.log(`[TEST] Ingresso aprovado com status: ${approvedTicket.status}`);
  console.log(`[TEST] HMAC Signature: ${approvedTicket.hmacSignature}`);

  // Validar assinatura HMAC
  const expectedSignature = cryptoService.generateSignature(ticket.id, '98765432100', batch.id);
  const isSignatureValid = approvedTicket.hmacSignature === expectedSignature;
  console.log(`[TEST] Assinatura é válida e autêntica? ${isSignatureValid ? 'Sim' : 'Não'} (Esperado: Sim)`);

  // 5. Simular chamada do GET /events/:id/staff-sync (api-read)
  console.log('[TEST] Simulando endpoint staff-sync...');
  const syncTickets = await prisma.ticket.findMany({
    where: {
      batch: { eventId: event.id },
      status: 'VALID',
    },
    select: {
      id: true,
      hmacSignature: true,
    },
  });

  const payload = syncTickets.map(t => ({
    ticket_id: t.id,
    hmacSignature: t.hmacSignature,
  }));

  console.log('[TEST] Payload retornado do Sync:', JSON.stringify(payload, null, 2));
  
  // Validar que nenhuma informação pessoal vazou no payload de sincronização
  const hasPersonalData = JSON.stringify(payload).includes('98765432100') || JSON.stringify(payload).includes('Comprador Cripto');
  console.log(`[TEST] Contém dados pessoais (CPF/Nome)? ${hasPersonalData ? 'Sim ❌' : 'Não ✅'} (Esperado: Não)`);

  // 6. Simular chamada de Mutação de Borda POST /events/:id/staff-mutation (api-write)
  console.log('[TEST] Simulando mutação de borda (check-in offline de ingressos consumidos)...');
  const ticketIdsToConsume = [ticket.id];
  
  const result = await prisma.ticket.updateMany({
    where: {
      id: { in: ticketIdsToConsume },
      batch: { eventId: event.id },
    },
    data: {
      status: 'CONSUMED',
    },
  });

  console.log(`[TEST] Quantidade de ingressos consumidos atualizada: ${result.count} (Esperado: 1)`);

  // Validar status final
  const finalTicket = await prisma.ticket.findUnique({
    where: { id: ticket.id },
  });
  console.log(`[TEST] Status final do ingresso no banco: ${finalTicket?.status} (Esperado: CONSUMED)`);

  // Limpeza
  await engine.onModuleDestroy();
  await redis.quit();

  if (
    isSignatureValid &&
    !hasPersonalData &&
    result.count === 1 &&
    finalTicket?.status === 'CONSUMED'
  ) {
    console.log('\n✅ TESTE DE CRIPTOGRAFIA E EDGE SYNC APROVADO COM SUCESSO!');
    process.exit(0);
  } else {
    console.error('\n❌ TESTE DE CRIPTOGRAFIA E EDGE SYNC FALHOU.');
    process.exit(1);
  }
}

runCryptoTest().catch(err => {
  console.error('[TEST] Erro durante o teste:', err);
  process.exit(1);
});
