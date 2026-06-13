"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FluxEngineModule = void 0;
const common_1 = require("@nestjs/common");
const flux_engine_service_1 = require("./flux-engine.service");
const checkout_service_1 = require("./checkout.service");
const ticket_crypto_service_1 = require("./ticket-crypto.service");
const checkout_controller_1 = require("./checkout.controller");
let FluxEngineModule = class FluxEngineModule {
};
exports.FluxEngineModule = FluxEngineModule;
exports.FluxEngineModule = FluxEngineModule = __decorate([
    (0, common_1.Module)({
        controllers: [checkout_controller_1.CheckoutController],
        providers: [flux_engine_service_1.FluxEngineService, checkout_service_1.CheckoutService, ticket_crypto_service_1.TicketCryptoService],
        exports: [flux_engine_service_1.FluxEngineService, checkout_service_1.CheckoutService, ticket_crypto_service_1.TicketCryptoService],
    })
], FluxEngineModule);
//# sourceMappingURL=flux-engine.module.js.map