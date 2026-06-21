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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketCryptoService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
let TicketCryptoService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var TicketCryptoService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TicketCryptoService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        secretKey = process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345';
        /**
         * Gera a assinatura HMAC SHA-256 para garantir a autenticidade offline do ingresso.
         * Suporta o novo padrão compacto (ticketId:version) e o padrão antigo (ticketId:cpf:batchId) para compatibilidade.
         */
        generateSignature(ticketId, versionOrCpf, batchId) {
            if (typeof versionOrCpf === 'number' || versionOrCpf === undefined) {
                const version = versionOrCpf ?? 1;
                const payload = `${ticketId}:${version}`;
                return crypto
                    .createHmac('sha256', this.secretKey)
                    .update(payload)
                    .digest('hex');
            }
            else {
                const payload = `${ticketId}:${versionOrCpf}:${batchId || ''}`;
                return crypto
                    .createHmac('sha256', this.secretKey)
                    .update(payload)
                    .digest('hex');
            }
        }
        /**
         * Generates the immutable QR payload containing only ticketId, version, and signature.
         * Never contains PII or pricing.
         */
        generateQrPayload(ticketId, version = 1) {
            const signature = this.generateSignature(ticketId, version);
            return {
                ticketId,
                version,
                signature,
            };
        }
        /**
         * Generates a reusable QR image URL.
         */
        generateQrUrl(ticketId, version = 1) {
            const payload = this.generateQrPayload(ticketId, version);
            const dataString = JSON.stringify(payload);
            return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dataString)}`;
        }
        /**
         * Verifies the signature of a payload. Returns true if valid, false otherwise.
         * Executes signature check using HMAC before any database lookup.
         */
        verifySignature(ticketId, version, signature) {
            const expected = this.generateSignature(ticketId, version);
            return expected === signature;
        }
        /**
         * Parses and validates a QR payload string.
         */
        verifyRawPayload(payloadStr) {
            try {
                const parsed = JSON.parse(payloadStr);
                if (!parsed.ticketId || typeof parsed.version !== 'number' || !parsed.signature) {
                    return { success: false, reason: 'MALFORMED_PAYLOAD' };
                }
                const isValid = this.verifySignature(parsed.ticketId, parsed.version, parsed.signature);
                if (!isValid) {
                    return { success: false, reason: 'INVALID_SIGNATURE' };
                }
                return { success: true, data: parsed };
            }
            catch {
                return { success: false, reason: 'MALFORMED_PAYLOAD' };
            }
        }
    };
    return TicketCryptoService = _classThis;
})();
exports.TicketCryptoService = TicketCryptoService;
//# sourceMappingURL=ticket-crypto.service.js.map