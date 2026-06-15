"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@flux/database");
const flux_engine_service_1 = require("../tickets/flux-engine.service");
const ticket_crypto_service_1 = require("../tickets/ticket-crypto.service");
const crypto = __importStar(require("crypto"));
let PaymentsService = PaymentsService_1 = class PaymentsService {
    fluxEngine;
    ticketCryptoService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(fluxEngine, ticketCryptoService) {
        this.fluxEngine = fluxEngine;
        this.ticketCryptoService = ticketCryptoService;
    }
    /**
     * Valida a assinatura de webhook enviada pelo Mercado Pago.
     * Utiliza o corpo bruto (Buffer) e o cabeçalho x-signature.
     */
    verifySignature(signatureHeader, rawBody, query) {
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
        }
        catch (err) {
            this.logger.error('[PAYMENTS WEBHOOK] Erro ao validar assinatura do webhook.', err);
            return false;
        }
    }
    /**
     * Processa o pagamento do checkout do ingresso.
     */
    async processCheckout(dto) {
        const ticketIds = dto.ticketId.split(',');
        // 1. Recupera os ingressos pré-reservados no Postgres
        const tickets = await database_1.prisma.ticket.findMany({
            where: { id: { in: ticketIds } },
            include: { batch: { include: { event: true } } },
        });
        if (tickets.length === 0) {
            throw new common_1.BadRequestException('Ingressos não encontrados.');
        }
        for (const ticket of tickets) {
            if (ticket.status !== 'PENDING_VALIDATION' && ticket.status !== 'PENDING_PAYMENT') {
                throw new common_1.BadRequestException('Um ou mais ingressos não estão elegíveis para pagamento.');
            }
            if (ticket.expiresAt.getTime() < Date.now()) {
                throw new common_1.BadRequestException('Sua reserva expirou e o ingresso foi liberado de volta ao estoque.');
            }
        }
        // 1.5. Busca ou cria o usuário com o e-mail real do comprador
        let user = await database_1.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            user = await database_1.prisma.user.create({
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
            await database_1.prisma.ticket.update({
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
        let mpStatus = 'approved';
        let qrCode = '00020126580014br.gov.bcb.pix2536pix.example.com/qr/v2/mock-code-12345';
        let qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        let paymentId = 'mp-' + crypto.randomUUID();
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const isMockMode = !accessToken || accessToken.startsWith('TEST-mock') || accessToken === 'mock';
        if (!isMockMode) {
            // 3. Chamada real à API do Mercado Pago
            const payload = {
                transaction_amount: amount,
                description: `Ingressos do Show: ${tickets[0].batch.event.title} (${tickets.length}x)`,
                external_reference: dto.ticketId,
                payer: {
                    email: dto.paymentMethod.method === 'credit_card' ? dto.paymentMethod.email : 'pix-buyer@flux.com',
                },
            };
            if (dto.paymentMethod.method === 'credit_card') {
                payload.payment_method_id = 'visa'; // Fallback
                payload.token = dto.paymentMethod.token;
                payload.installments = dto.paymentMethod.installments;
                payload.issuer_id = dto.paymentMethod.issuerId;
            }
            else {
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
                    const errData = await response.json();
                    throw new Error(errData.message || 'Erro na resposta do Mercado Pago.');
                }
                const mpData = await response.json();
                mpStatus = mpData.status;
                paymentId = mpData.id.toString();
                if (mpData.payment_method_id === 'pix') {
                    qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || qrCode;
                    qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || qrCodeBase64;
                }
            }
            catch (err) {
                this.logger.error(`[MERCADO PAGO API ERROR] Falha no pagamento do ticket ${dto.ticketId}`, err);
                mpStatus = 'rejected';
            }
        }
        else {
            // 4. Modo Mock local de simulação
            this.logger.log(`[MERCADO PAGO MOCK MODE] Processando pagamento de R$ ${amount} no ticket ${dto.ticketId}`);
            if (dto.paymentMethod.method === 'credit_card') {
                const tokenStr = dto.paymentMethod.token;
                if (tokenStr.includes('pending') || tokenStr.includes('process')) {
                    mpStatus = 'in_process';
                }
                else if (tokenStr.includes('rejected') || tokenStr.includes('fail')) {
                    mpStatus = 'rejected';
                }
                else {
                    mpStatus = 'approved';
                }
            }
            else {
                // PIX padrão pendente
                mpStatus = 'pending';
            }
        }
        // 5. Máquina de Estado e compensação
        return this.handlePaymentState(tickets, mpStatus, { qrCode, qrCodeBase64, paymentId });
    }
    /**
     * Gerencia a máquina de estados do pagamento.
     */
    async handlePaymentState(tickets, status, meta) {
        if (status === 'approved') {
            for (const ticket of tickets) {
                // 1. Aprovado: Verifica se é estudante (meia-entrada)
                const isStudent = ticket.meiaEntrada === true;
                // 2. Gera a assinatura HMAC usando o CPF do titular (ou comprador se nulo)
                const activeCpf = ticket.holderCpf || ticket.buyerCpf;
                const signature = this.ticketCryptoService.generateSignature(ticket.id, activeCpf, ticket.batchId);
                // 3. Atualiza o status e a assinatura
                await database_1.prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        status: isStudent ? 'PENDING_VALIDATION' : 'VALID',
                        hmacSignature: signature,
                        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Válido por 1 ano
                    },
                });
                // 4. Libera o lock do Redis
                await this.fluxEngine.releaseTicketLock(ticket.batchId, ticket.buyerId, ticket.id);
            }
            this.logger.log(`[PAYMENT SUCCESS] ${tickets.length} tickets aprovados.`);
            return {
                status: 'approved',
                ticketId: tickets.map(t => t.id).join(','),
                isStudent: tickets.some(t => t.meiaEntrada === true),
            };
        }
        else if (status === 'in_process' || status === 'pending') {
            // Pendente / Em Análise: Salva como PENDING_PAYMENT e estende expirations
            const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // +15 minutos
            for (const ticket of tickets) {
                await database_1.prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        status: 'PENDING_PAYMENT',
                        expiresAt: newExpiresAt,
                    },
                });
                // Estende o lock no Redis para 15 minutos (900s)
                await this.fluxEngine.extendTicketLock(ticket.buyerId, ticket.id, ticket.batchId, 900);
            }
            this.logger.log(`[PAYMENT PENDING] ${tickets.length} tickets pendentes. Locks do Redis estendidos por 15min.`);
            return {
                status: status === 'in_process' ? 'in_process' : 'pending',
                ticketId: tickets.map(t => t.id).join(','),
                qrCode: meta.qrCode,
                qrCodeBase64: meta.qrCodeBase64,
                paymentId: meta.paymentId,
            };
        }
        else {
            // Rejeitado / Cancelado: Executa a ação de compensação (devolve estoque)
            this.logger.warn(`[PAYMENT REJECTED] Ingressos rejeitados. Executando compensação...`);
            for (const ticket of tickets) {
                // Devolve o estoque do Redis
                await this.fluxEngine.releaseTicketLock(ticket.batchId, ticket.buyerId, ticket.id);
                // Restaura o estoque no PostgreSQL
                await database_1.prisma.ticketBatch.update({
                    where: { id: ticket.batchId },
                    data: {
                        availableQuantity: {
                            increment: 1,
                        },
                    },
                });
                // Exclui a linha correspondente no PostgreSQL
                await database_1.prisma.ticket.delete({
                    where: { id: ticket.id },
                });
            }
            throw new common_1.BadRequestException('O pagamento foi recusado pela instituição financeira ou cancelado.');
        }
    }
    /**
     * Processa atualizações tardias de webhooks assíncronos.
     */
    async handleWebhookNotification(paymentId) {
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
                const data = await res.json();
                status = data.status;
                externalReference = data.external_reference;
            }
            catch (err) {
                this.logger.error(`[MERCADO PAGO WEBHOOK API ERROR] Falha ao recuperar status do webhook payment ${paymentId}`, err);
                return;
            }
        }
        else {
            // Em dev mockado: ID contendo "reject" vira rejected, resto approved
            status = paymentId.includes('reject') ? 'rejected' : 'approved';
            // Localiza o ticket pendente mais antigo no banco para aplicar a atualização mock
            const pendingTicket = await database_1.prisma.ticket.findFirst({
                where: { status: 'PENDING_PAYMENT' },
            });
            if (pendingTicket) {
                externalReference = pendingTicket.id;
            }
            else {
                this.logger.warn('[PAYMENTS WEBHOOK MOCK] Nenhum ticket em status PENDING_PAYMENT encontrado para atualizar.');
                return;
            }
        }
        if (!externalReference)
            return;
        // Busca os Tickets associados
        const ticketIds = externalReference.split(',');
        const tickets = await database_1.prisma.ticket.findMany({
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
        }
        catch (err) {
            this.logger.error(`[PAYMENTS WEBHOOK ERROR] Falha ao transicionar estado dos tickets ${externalReference}`, err);
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [flux_engine_service_1.FluxEngineService,
        ticket_crypto_service_1.TicketCryptoService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map