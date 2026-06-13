import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    checkout(body: any): Promise<any>;
    webhook(signatureHeader: string, req: RawBodyRequest<Request>, query: any, body: any): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=payments.controller.d.ts.map