"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const flux_engine_module_1 = require("./tickets/flux-engine.module");
const events_module_1 = require("./events/events.module");
const payments_module_1 = require("./payments/payments.module");
const audit_module_1 = require("./audit/audit.module");
const monitoring_module_1 = require("./monitoring/monitoring.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000, // 60 seconds (1 minute)
                    limit: 60, // 60 requests
                }]),
            flux_engine_module_1.FluxEngineModule,
            events_module_1.EventsModule,
            payments_module_1.PaymentsModule,
            audit_module_1.AuditModule,
            monitoring_module_1.MonitoringModule
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            }
        ]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map