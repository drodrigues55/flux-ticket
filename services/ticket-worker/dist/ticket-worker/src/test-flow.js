"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@flux/database");
const checkout_service_1 = require("../../api-write/src/tickets/checkout.service");
const flux_engine_service_1 = require("../../api-write/src/tickets/flux-engine.service");
const ticket_crypto_service_1 = require("../../api-write/src/tickets/ticket-crypto.service");
const outbox_publisher_1 = require("./outbox-publisher");
const ticket_validation_worker_1 = require("./ticket-validation.worker");
const ioredis_1 = __importDefault(require("ioredis"));
// Reduz o delay da SLA para 2 segundos para o teste rodar rápido
process.env.VALIDATION_DELAY_MS = '2000';
async function runTest() {
    console.log('--- INICIANDO TESTE DE INTEGRAÇÃO ---');
    const redis = new ioredis_1.default({
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
    });
    const engine = new flux_engine_service_1.FluxEngineService();
    await engine.onModuleInit();
    const cryptoService = new ticket_crypto_service_1.TicketCryptoService();
    const checkoutService = new checkout_service_1.CheckoutService(engine, cryptoService);
    // 1. Limpar dados anteriores do teste
    console.log('[TEST] Limpando dados antigos...');
    await database_1.prisma.outboxEvent.deleteMany({});
    await database_1.prisma.ticket.deleteMany({});
    await database_1.prisma.ticketBatch.deleteMany({});
    await database_1.prisma.event.deleteMany({});
    await database_1.prisma.user.deleteMany({});
    const redisKeys = await redis.keys('lock:*');
    if (redisKeys.length > 0) {
        await redis.del(...redisKeys);
    }
    // 2. Criar massa de dados
    console.log('[TEST] Criando massa de teste no banco relacional...');
    const user = await database_1.prisma.user.create({
        data: {
            email: 'test@example.com',
            password: 'password123',
            name: 'Comprador Teste',
            role: 'USER',
        },
    });
    const event = await database_1.prisma.event.create({
        data: {
            title: 'Show Concorrente de Teste',
            location: 'Arena Digital',
            date: new Date(),
            organizerId: user.id,
        },
    });
    const batch = await database_1.prisma.ticketBatch.create({
        data: {
            name: 'Lote Único Meia-Entrada',
            price: 50.00,
            totalQuantity: 1,
            availableQuantity: 1, // Começa com 1
            eventId: event.id,
        },
    });
    // 3. Definir estoque de 1 no Redis
    console.log('[TEST] Inicializando estoque no Redis...');
    const redisKey = `stock:{${batch.id}}`;
    await redis.set(redisKey, 1);
    // 4. Executar Checkout do ingresso meia-entrada
    console.log('[TEST] Executando checkout concorrente (meia-entrada)...');
    const ticket = await checkoutService.checkout({
        userId: user.id,
        eventId: event.id,
        batchId: batch.id,
        buyerCpf: '12345678900',
        price: 50.00,
        isHalfPrice: true,
    });
    console.log(`[TEST] Checkout finalizado. ID do Ingresso: ${ticket.id}`);
    // Validar se o estoque diminuiu no Redis
    const redisStock = await redis.get(redisKey);
    console.log(`[TEST] Estoque atual no Redis: ${redisStock} (Esperado: 0)`);
    // Validar se o evento Outbox foi criado
    const pendingOutbox = await database_1.prisma.outboxEvent.findFirst({
        where: { status: 'PENDING' },
    });
    console.log(`[TEST] Evento no Outbox criado com status: ${pendingOutbox?.status} (Esperado: PENDING)`);
    // 5. Rodar o Outbox Publisher manualmente para enfileirar
    console.log('[TEST] Executando Outbox Publisher...');
    await (0, outbox_publisher_1.processOutbox)();
    // Validar se o evento foi para PROCESSED
    const processedOutbox = await database_1.prisma.outboxEvent.findUnique({
        where: { id: pendingOutbox?.id },
    });
    console.log(`[TEST] Evento no Outbox atualizado para: ${processedOutbox?.status} (Esperado: PROCESSED)`);
    // 6. Aguardar 3 segundos para dar tempo do job de SLA vencer (delay = 2s)
    console.log('[TEST] Aguardando 3 segundos para vencimento da SLA no worker...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    // 7. Validar as compensações no PostgreSQL e Redis
    console.log('[TEST] Validando estado pós-processamento do Worker...');
    const updatedTicket = await database_1.prisma.ticket.findUnique({
        where: { id: ticket.id },
    });
    console.log(`[TEST] Status do ingresso: ${updatedTicket?.status} (Esperado: REVOKED)`);
    const updatedBatch = await database_1.prisma.ticketBatch.findUnique({
        where: { id: batch.id },
    });
    console.log(`[TEST] Estoque do lote no Postgres: ${updatedBatch?.availableQuantity} (Esperado: 1)`);
    const updatedRedisStock = await redis.get(redisKey);
    console.log(`[TEST] Estoque do lote no Redis: ${updatedRedisStock} (Esperado: 1)`);
    // Limpeza
    await engine.onModuleDestroy();
    await ticket_validation_worker_1.ticketValidationWorker.close();
    await redis.quit();
    if (updatedTicket?.status === 'REVOKED' &&
        updatedBatch?.availableQuantity === 1 &&
        Number(updatedRedisStock) === 1) {
        console.log('\n✅ TESTE DE INTEGRAÇÃO APROVADO: A transação ACID, a tabela Outbox e o Worker BullMQ com SLA de compensação funcionaram perfeitamente!');
        process.exit(0);
    }
    else {
        console.error('\n❌ TESTE DE INTEGRAÇÃO FALHOU: O fluxo de compensação ou os dados não batem.');
        process.exit(1);
    }
}
runTest().catch(err => {
    console.error('[TEST] Erro durante a execução:', err);
    process.exit(1);
});
//# sourceMappingURL=test-flow.js.map