"use strict";
/**
 * @flux/types — Canonical domain dictionary for the Flux Tickets platform.
 *
 * This is the single source of truth for all shared interfaces, enums, and
 * API response contracts consumed by:
 *   - apps/client        (consumer sale pages)
 *   - apps/dashboard     (organizer dashboard)
 *   - services/api-write (NestJS write service)
 *   - services/api-read  (Express read/catalog service)
 *
 * NAMING RULES (enforced across all apps):
 *   - Ticket lot/category  → "batch" / "batchId"    (never "lote" or "lot")
 *   - Person who paid      → "buyer" / "buyerId"
 *   - Person who attends   → "holder" / "holderName"
 *   - Event show           → "event" / "eventId"    (never "show" in code)
 *   - Occupancy metric     → "occupancyPct"          (always 0–100 number)
 *   - Revenue              → "grossRevenue"           (always BRL decimal)
 *   - Ticket price         → "price"                 (BRL decimal, NOT cents)
 *   - Event cover photo    → "imageUrl"              (string | null)
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./cpf"), exports);
//# sourceMappingURL=index.js.map