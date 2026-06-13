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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FluxEngineService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let FluxEngineService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var FluxEngineService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FluxEngineService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(FluxEngineService.name);
        redisClient;
        reserveTicketsScriptSha;
        async onModuleInit() {
            // Initialize Redis Client using ioredis
            // For local development, it defaults to localhost:6379
            this.redisClient = new ioredis_1.default({
                host: process.env.REDIS_HOST || 'localhost',
                port: Number(process.env.REDIS_PORT) || 6379,
            });
            this.redisClient.on('error', (err) => {
                this.logger.error('Redis client error', err);
            });
            await this.loadScripts();
        }
        onModuleDestroy() {
            if (this.redisClient) {
                this.redisClient.quit();
            }
        }
        async loadScripts() {
            try {
                let scriptPath = path.join(__dirname, 'reserve_ticket.lua');
                if (!fs.existsSync(scriptPath)) {
                    scriptPath = path.join(process.cwd(), 'src/tickets/reserve_ticket.lua');
                }
                const scriptContent = fs.readFileSync(scriptPath, 'utf8');
                // Load script into Redis and keep the SHA for efficient execution
                this.reserveTicketsScriptSha = await this.redisClient.script('LOAD', scriptContent);
                this.logger.log('Lua script for atomic ticket reservation loaded successfully.');
            }
            catch (error) {
                this.logger.error('Failed to load Lua scripts. Check if the path services/api-write/src/tickets/reserve_ticket.lua exists.', error);
                throw error;
            }
        }
        /**
         * Atomically reserve tickets for a batch.
         * @param batchId The ID of the ticket batch
         * @param userId The ID of the user buying the ticket
         * @param ticketId The ID of the ticket being reserved
         * @param requestedAmount Number of tickets to reserve
         * @returns boolean True if reservation was successful, false if insufficient tickets
         */
        async reserveTickets(batchId, userId, ticketId, requestedAmount) {
            // Hash Tag guarantees stock key and lock key end up in the same slot
            const availableTicketsKey = `stock:{${batchId}}`;
            const reservationLockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
            // Default TTL is 3 minutes (180 seconds)
            const ttlSeconds = 180;
            try {
                const result = await this.redisClient.evalsha(this.reserveTicketsScriptSha, 2, // Number of keys
                availableTicketsKey, reservationLockKey, requestedAmount.toString(), ttlSeconds.toString());
                return result === 1;
            }
            catch (error) {
                this.logger.error(`Error executing reservation script for batch ${batchId}`, error);
                return false;
            }
        }
        /**
         * Renova o lock temporário de um ingresso por mais 60 segundos (Heartbeat).
         * Retorna/lança erro se o lock já tiver expirado.
         * Executa puramente em memória recebendo o batchId.
         */
        async renewTicketLock(userId, ticketId, batchId) {
            const lockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
            // Consulta o TTL restante
            const ttl = await this.redisClient.ttl(lockKey);
            if (ttl < 0) {
                throw new Error('Lock has expired or does not exist');
            }
            // Estende o lock por mais 60 segundos
            const result = await this.redisClient.expire(lockKey, 60);
            return result === 1;
        }
        /**
         * Libera o lock temporário e reabastece o estoque do Redis (ação de compensação).
         */
        async releaseTicketLock(batchId, userId, ticketId) {
            const availableTicketsKey = `stock:{${batchId}}`;
            const reservationLockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
            const quantityStr = await this.redisClient.get(reservationLockKey);
            if (quantityStr) {
                const quantity = Number(quantityStr) || 1;
                const pipeline = this.redisClient.pipeline();
                pipeline.incrby(availableTicketsKey, quantity);
                pipeline.del(reservationLockKey);
                await pipeline.exec();
            }
        }
        /**
         * Inicializa o estoque de um lote no Redis.
         */
        async setBatchStock(batchId, quantity) {
            const stockKey = `stock:{${batchId}}`;
            await this.redisClient.set(stockKey, quantity);
        }
        /**
         * Estende a expiração de um lock temporário no Redis.
         */
        async extendTicketLock(userId, ticketId, batchId, ttlSeconds) {
            const lockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
            const result = await this.redisClient.expire(lockKey, ttlSeconds);
            return result === 1;
        }
    };
    return FluxEngineService = _classThis;
})();
exports.FluxEngineService = FluxEngineService;
//# sourceMappingURL=flux-engine.service.js.map