import { prisma } from '@flux/database';
import { CheckoutService } from './src/tickets/checkout.service';
import { FluxEngineService } from './src/tickets/flux-engine.service';
import { TicketCryptoService } from './src/tickets/ticket-crypto.service';
import Redis from 'ioredis';

async function runStressTest() {
  console.log('=== INICIANDO TESTE DE ESTRESSE DE CONCORRÊNCIA INTEGRADA ===');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
  });

  const engine = new FluxEngineService();
  await engine.onModuleInit();
  const cryptoService = new TicketCryptoService();
  const checkoutService = new CheckoutService(engine, cryptoService);

  const eventId = 'stress-test-event-concurrency';
  const totalTickets = 50;
  const totalRequests = 500;

  // 1. Setup de Dados (Seed & Reset)
  console.log('[SETUP] Limpando tabelas de teste...');
  await prisma.outboxEvent.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.ticketBatch.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  const oldLocks = await redis.keys('lock:*');
  if (oldLocks.length > 0) {
    await redis.del(...oldLocks);
  }

  console.log('[SETUP] Criando massa de dados no PostgreSQL (estoque: 50)...');
  
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@stress.com',
      password: 'password123',
      name: 'Organizer',
      role: 'ORGANIZER',
    },
  });

  // Criar 500 usuários fictícios para compras simultâneas por compradores diferentes
  console.log('[SETUP] Criando 500 usuários fictícios para as compras simuladas...');
  const usersData = [];
  for (let i = 0; i < totalRequests; i++) {
    usersData.push({
      email: `buyer-${i}@stress.com`,
      password: 'password123',
      name: `Buyer ${i}`,
      role: 'USER',
    });
  }
  
  await prisma.user.createMany({
    data: usersData,
  });
  
  const dbUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'buyer-' } },
    select: { id: true },
  });

  const event = await prisma.event.create({
    data: {
      id: eventId,
      title: 'Mega Show Concorrente',
      location: 'Arena Digital',
      date: new Date(),
      organizerId: organizer.id,
    },
  });

  const batch = await prisma.ticketBatch.create({
    data: {
      name: 'Lote de Ingressos Concorrente',
      price: 100.00,
      totalQuantity: totalTickets,
      availableQuantity: totalTickets,
      eventId: event.id,
    },
  });

  console.log('[SETUP] Inicializando estoque no Redis (estoque: 50)...');
  const redisKey = `stock:{${batch.id}}`;
  await redis.set(redisKey, totalTickets);

  // 2. Disparo de Concorrência (Race Condition)
  console.log(`[CONCURRÊNCIA] Disparando ${totalRequests} checkouts assíncronos simulados em paralelo...`);
  
  const promises = dbUsers.map((user, idx) => {
    return checkoutService.checkout({
      userId: user.id,
      eventId: event.id,
      batchId: batch.id,
      buyerCpf: `111222333${idx.toString().padStart(2, '0')}`,
      price: 100.00,
      isHalfPrice: false,
    });
  });

  const startTime = Date.now();
  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  console.log(`[CONCURRÊNCIA] Concluído em ${duration}ms.`);

  // 3. Asserção Rigorosa (Validação de Resultados)
  const successes = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected').length;

  const activeLocks = await redis.keys('lock:*');
  const finalRedisStock = await redis.get(redisKey);

  const finalDbBatch = await prisma.ticketBatch.findUnique({
    where: { id: batch.id },
  });
  const finalDbTicketsCount = await prisma.ticket.count({
    where: { batchId: batch.id },
  });
  const finalOutboxEventsCount = await prisma.outboxEvent.count({
    where: { aggregateType: 'TICKET_RESERVED' },
  });

  console.log('\n==================================================');
  console.log('             RELATÓRIO DE TESTE DE ESTRESSE       ');
  console.log('==================================================');
  console.log(`Sucessos (Checkout):    ${successes} (Esperado: 50)`);
  console.log(`Falhas (Rejeições):    ${failures} (Esperado: 450)`);
  console.log(`Locks ativos no Redis:  ${activeLocks.length} (Esperado: 50)`);
  console.log(`Estoque final no Redis: ${finalRedisStock} (Esperado: 0)`);
  console.log(`Estoque final no DB:    ${finalDbBatch?.availableQuantity} (Esperado: 0)`);
  console.log(`Ingressos no DB:        ${finalDbTicketsCount} (Esperado: 50)`);
  console.log(`Eventos Outbox no DB:   ${finalOutboxEventsCount} (Esperado: 50)`);
  console.log('==================================================\n');

  // Fechamento de conexões
  await engine.onModuleDestroy();
  await redis.quit();

  const isSuccessOk = successes === 50;
  const isFailureOk = failures === 450;
  const isLocksOk = activeLocks.length === 50;
  const isRedisStockOk = Number(finalRedisStock) === 0;
  const isDbStockOk = finalDbBatch?.availableQuantity === 0;
  const isTicketsOk = finalDbTicketsCount === 50;
  const isOutboxOk = finalOutboxEventsCount === 50;

  if (isSuccessOk && isFailureOk && isLocksOk && isRedisStockOk && isDbStockOk && isTicketsOk && isOutboxOk) {
    console.log('✅ TESTE PASSED: A integridade transacional de concorrência foi validada com sucesso em todos os níveis!');
    process.exit(0);
  } else {
    console.error('❌ TESTE FAILED: Alguma das restrições de concorrência ou consistência foi violada.');
    process.exit(1);
  }
}

runStressTest().catch(err => {
  console.error('[ERRO] Falha na execução do teste de estresse:', err);
  process.exit(1);
});
