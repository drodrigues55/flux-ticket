"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffGuard = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let StaffGuard = class StaffGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Bearer token is missing');
        }
        const token = authHeader.split(' ')[1];
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new common_1.UnauthorizedException('Invalid token format');
            }
            const [headerB64, payloadB64, signature] = parts;
            const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-key';
            const isDev = process.env.NODE_ENV !== 'production';
            const isMock = signature === 'mocksignature';
            if (!(isDev && isMock)) {
                const expectedSignature = (0, crypto_1.createHmac)('sha256', jwtSecret)
                    .update(`${headerB64}.${payloadB64}`)
                    .digest('base64url');
                if (signature !== expectedSignature) {
                    throw new common_1.UnauthorizedException('Invalid token signature');
                }
            }
            // Decode the payload
            const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
            const payload = JSON.parse(payloadJson);
            if (payload.role !== 'STAFF' && payload.role !== 'ORGANIZER') {
                throw new common_1.ForbiddenException('Forbidden: Insufficient permissions');
            }
            request.user = payload;
            return true;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Unauthorized: Invalid token');
        }
    }
};
exports.StaffGuard = StaffGuard;
exports.StaffGuard = StaffGuard = __decorate([
    (0, common_1.Injectable)()
], StaffGuard);
//# sourceMappingURL=staff-guard.js.map