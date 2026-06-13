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
            // Decodifica o payload do JWT em formato base64url
            const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
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