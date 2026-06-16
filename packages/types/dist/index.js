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
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=index.js.map