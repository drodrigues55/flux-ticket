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
const types_1 = require("@flux/types");
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
        criticalTimeoutMs = Number(process.env.REDIS_CRITICAL_TIMEOUT_MS) || 1500;
        nonCriticalTimeoutMs = Number(process.env.REDIS_NON_CRITICAL_TIMEOUT_MS) || 750;
        async onModuleInit() {
            const config = (0, types_1.parseRedisConfig)('cache', process.env);
            if (process.env.NODE_ENV === 'production' && !config.url && !process.env.REDIS_HOST && !process.env.REDIS_URL) {
                throw new Error('Production environment is missing required Redis configuration');
            }
            const redisOptions = {
                ...config.options,
                connectTimeout: this.criticalTimeoutMs,
                maxRetriesPerRequest: 1,
                commandTimeout: this.criticalTimeoutMs,
            };
            this.redisClient = config.url
                ? new ioredis_1.default(config.url, redisOptions)
                : new ioredis_1.default(redisOptions);
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
        withTimeout(operation, timeoutMs, label) {
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`Redis operation timed out: ${label}`)), timeoutMs);
            });
            return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
        }
        async criticalRedis(label, operation) {
            try {
                return await this.withTimeout(operation, this.criticalTimeoutMs, label);
            }
            catch (error) {
                this.logger.error(`Critical Redis operation failed: ${label}`, error);
                throw error;
            }
        }
        async nonCriticalRedis(label, operation, fallback) {
            try {
                return await this.withTimeout(operation, this.nonCriticalTimeoutMs, label);
            }
            catch (error) {
                this.logger.warn(`Non-critical Redis operation degraded: ${label}`, error);
                return fallback;
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
                const result = await this.criticalRedis('reserveTickets', this.redisClient.evalsha(this.reserveTicketsScriptSha, 2, // Number of keys
                availableTicketsKey, reservationLockKey, requestedAmount.toString(), ttlSeconds.toString()));
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
            const ttl = await this.criticalRedis('renewTicketLock.ttl', this.redisClient.ttl(lockKey));
            if (ttl < 0) {
                throw new Error('Lock has expired or does not exist');
            }
            // Estende o lock por mais 60 segundos
            const result = await this.criticalRedis('renewTicketLock.expire', this.redisClient.expire(lockKey, 60));
            return result === 1;
        }
        /**
         * Libera o lock temporário e reabastece o estoque do Redis (ação de compensação).
         */
        async releaseTicketLock(batchId, userId, ticketId) {
            const availableTicketsKey = `stock:{${batchId}}`;
            const reservationLockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
            const quantityStr = await this.criticalRedis('releaseTicketLock.get', this.redisClient.get(reservationLockKey));
            if (quantityStr) {
                const quantity = Number(quantityStr) || 1;
                const pipeline = this.redisClient.pipeline();
                pipeline.incrby(availableTicketsKey, quantity);
                pipeline.del(reservationLockKey);
                await this.criticalRedis('releaseTicketLock.pipeline', pipeline.exec());
            }
        }
        /**
         * Verifica se o estoque de um lote já foi inicializado no Redis.
         */
        async isStockInitialized(batchId) {
            const stockKey = `stock:{${batchId}}`;
            const result = await this.criticalRedis('isStockInitialized', this.redisClient.exists(stockKey));
            return result === 1;
        }
        /**
         * Inicializa o estoque de um lote no Redis.
         */
        async setBatchStock(batchId, quantity) {
            const stockKey = `stock:{${batchId}}`;
            await this.criticalRedis('setBatchStock', this.redisClient.set(stockKey, quantity));
        }
        /**
         * Estende a expiração de um lock temporário no Redis.
         */
        async extendTicketLock(userId, ticketId, batchId, ttlSeconds) {
            const lockKey = `lock:{${batchId}}:${userId}:${ticketId}`;
            const result = await this.criticalRedis('extendTicketLock', this.redisClient.expire(lockKey, ttlSeconds));
            return result === 1;
        }
        async getCheckoutLimit() {
            const limit = await this.criticalRedis('getCheckoutLimit', this.redisClient.get('settings:checkout_limit'));
            return limit ? parseInt(limit, 10) : 1000;
        }
        async getCheckoutLimitSafe() {
            const limit = await this.nonCriticalRedis('getCheckoutLimitSafe', this.redisClient.get('settings:checkout_limit'), null);
            return limit ? parseInt(limit, 10) : 1000;
        }
        async setCheckoutLimit(limit) {
            await this.criticalRedis('setCheckoutLimit', this.redisClient.set('settings:checkout_limit', limit.toString()));
        }
        async isSalesPaused() {
            const paused = await this.criticalRedis('isSalesPaused', this.redisClient.get('settings:sales_paused:global'));
            return paused === 'true';
        }
        async isSalesPausedSafe() {
            const paused = await this.nonCriticalRedis('isSalesPausedSafe', this.redisClient.get('settings:sales_paused:global'), null);
            return paused === 'true';
        }
        async setSalesPaused(paused) {
            await this.criticalRedis('setSalesPaused', this.redisClient.set('settings:sales_paused:global', paused ? 'true' : 'false'));
        }
        async incrementDeniedAttempts(eventId) {
            return this.nonCriticalRedis('incrementDeniedAttempts', this.redisClient.incr(`event:${eventId}:denied_attempts`), 0);
        }
        async getDeniedAttempts(eventId) {
            const count = await this.nonCriticalRedis('getDeniedAttempts', this.redisClient.get(`event:${eventId}:denied_attempts`), null);
            return count ? parseInt(count, 10) : 0;
        }
        async registerStaffDevice(eventId, deviceId, deviceName, pendingCount, allowedSectorIds = []) {
            const deviceData = JSON.stringify({
                deviceId,
                deviceName,
                lastSyncTime: new Date().toISOString(),
                pendingSyncCount: pendingCount,
                allowedSectorIds,
            });
            await this.nonCriticalRedis('registerStaffDevice', this.redisClient.hset(`event:${eventId}:staff_devices`, deviceId, deviceData), 0);
        }
        async getStaffDevices(eventId) {
            const devicesMap = await this.nonCriticalRedis('getStaffDevices', this.redisClient.hgetall(`event:${eventId}:staff_devices`), {});
            return Object.values(devicesMap).map((data) => JSON.parse(data));
        }
        async addLatencyMetric(latencyMs) {
            const key = 'telemetry:latency_history';
            await this.nonCriticalRedis('addLatencyMetric', this.redisClient
                .pipeline()
                .lpush(key, latencyMs.toString())
                .ltrim(key, 0, 19)
                .exec(), []);
        }
        async getLatencyHistory() {
            const list = await this.nonCriticalRedis('getLatencyHistory', this.redisClient.lrange('telemetry:latency_history', 0, 19), []);
            return list.map((val) => parseFloat(val));
        }
        async addQueueSizeMetric(size) {
            const key = 'telemetry:validation_queue_history';
            await this.nonCriticalRedis('addQueueSizeMetric', this.redisClient
                .pipeline()
                .lpush(key, size.toString())
                .ltrim(key, 0, 19)
                .exec(), []);
        }
        async getQueueSizeHistory() {
            const list = await this.nonCriticalRedis('getQueueSizeHistory', this.redisClient.lrange('telemetry:validation_queue_history', 0, 19), []);
            return list.map((val) => parseInt(val, 10));
        }
        async getRedisInfoStats() {
            try {
                const stats = await this.nonCriticalRedis('getRedisInfoStats', this.redisClient.info('stats'), '');
                const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
                const missesMatch = stats.match(/keyspace_misses:(\d+)/);
                return {
                    hits: hitsMatch ? parseInt(hitsMatch[1], 10) : 0,
                    misses: missesMatch ? parseInt(missesMatch[1], 10) : 0,
                };
            }
            catch {
                return { hits: 0, misses: 0 };
            }
        }
        async getQueueStats(queueName) {
            const prefix = `bull:${queueName}`;
            const [waiting, active, delayed, failed, completed] = await Promise.all([
                this.nonCriticalRedis('getQueueStats.wait', this.redisClient.llen(`${prefix}:wait`), 0),
                this.nonCriticalRedis('getQueueStats.active', this.redisClient.llen(`${prefix}:active`), 0),
                this.nonCriticalRedis('getQueueStats.delayed', this.redisClient.zcard(`${prefix}:delayed`), 0),
                this.nonCriticalRedis('getQueueStats.failed', this.redisClient.zcard(`${prefix}:failed`), 0),
                this.nonCriticalRedis('getQueueStats.completed', this.redisClient.zcard(`${prefix}:completed`), 0),
            ]);
            return { waiting, active, delayed, failed, completed };
        }
    };
    return FluxEngineService = _classThis;
})();
exports.FluxEngineService = FluxEngineService;
//# sourceMappingURL=flux-engine.service.js.map