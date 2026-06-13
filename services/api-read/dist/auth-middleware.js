"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Bearer token is missing' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
        }
        // Decodifica a carga útil do JWT base64url
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        if (payload.role !== 'STAFF' && payload.role !== 'ORGANIZER') {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}
//# sourceMappingURL=auth-middleware.js.map