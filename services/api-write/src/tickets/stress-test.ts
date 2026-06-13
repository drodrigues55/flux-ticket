import { FluxEngineService } from './flux-engine.service';
import Redis from 'ioredis';

async function run() {
  const service = new FluxEngineService();
  await service.onModuleInit();
  
  const batchId = 'stress-test-batch';
  const totalTickets = 50;
  const totalRequests = 500;
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  });
  
  // Reset Redis state for the stress test
  await redis.set(`stock:{${batchId}}`, totalTickets);
  
  // Clear any existing test reservations
  const keys = await redis.keys(`lock:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  
  console.log(`[STRESS TEST] Iniciando com ${totalRequests} requisições concorrentes e ${totalTickets} ingressos disponíveis no Redis...`);
  
  const promises: Promise<boolean>[] = [];
  for (let i = 0; i < totalRequests; i++) {
    promises.push(service.reserveTickets(batchId, `user-${i}`, `ticket-${i}`, 1));
  }
  
  // Fire all requests concurrently
  const results = await Promise.all(promises);
  
  const successes = results.filter(r => r === true).length;
  const failures = results.filter(r => r === false).length;
  
  const finalStock = await redis.get(`stock:{${batchId}}`);
  
  console.log('\n--- RESULTADOS DO TESTE DE ESTRESSE ---');
  console.log(`Sucessos: ${successes} (Esperado: 50)`);
  console.log(`Falhas:    ${failures} (Esperado: 450)`);
  console.log(`Estoque final no Redis: ${finalStock} (Esperado: 0)`);
  
  await service.onModuleDestroy();
  await redis.quit();
  
  if (successes === 50 && failures === 450 && Number(finalStock) === 0) {
    console.log('\n✅ TESTE APROVADO: Apenas as 50 vagas foram alocadas e o estoque não ficou negativo.');
    process.exit(0);
  } else {
    console.error('\n❌ TESTE FALHOU: O comportamento atômico de alocação falhou ou os números não batem.');
    process.exit(1);
  }
}

run().catch(error => {
  console.error('[STRESS TEST] Erro durante a execução:', error);
  process.exit(1);
});
