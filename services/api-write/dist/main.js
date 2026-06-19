"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./all-exceptions.filter");
const env_validation_1 = require("./env.validation");
async function bootstrap() {
    (0, env_validation_1.validateRuntimeEnv)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { rawBody: true });
    app.enableCors();
    const httpAdapter = app.get(core_1.HttpAdapterHost);
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(httpAdapter));
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`[API-WRITE] NestJS API Server listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map