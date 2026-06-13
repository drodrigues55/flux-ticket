"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const outbox_publisher_1 = require("./outbox-publisher");
const ticket_validation_worker_1 = require("./ticket-validation.worker");
async function bootstrap() {
    console.log('[WORKER SYSTEM] Iniciando o ticket-worker...');
    // Inicializa o Worker do BullMQ
    console.log('[WORKER SYSTEM] Worker do BullMQ ativado escutando a fila "TicketValidationQueue".');
    // Loop do Outbox Publisher executando a cada 5 segundos
    console.log('[WORKER SYSTEM] Loop do Outbox Publisher ativado (intervalo: 5s).');
    setInterval(async () => {
        try {
            await (0, outbox_publisher_1.processOutbox)();
        }
        catch (error) {
            console.error('[WORKER SYSTEM] Erro no loop do Outbox Publisher:', error);
        }
    }, 5000);
}
// Lidar com desligamento gracioso
process.on('SIGTERM', async () => {
    console.log('[WORKER SYSTEM] Desligando o worker...');
    await ticket_validation_worker_1.ticketValidationWorker.close();
    process.exit(0);
});
bootstrap();
//# sourceMappingURL=index.js.map