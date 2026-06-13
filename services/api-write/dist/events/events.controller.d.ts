import { EventsService } from './events.service';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    /**
     * Rota para criação de evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    create(body: {
        title: string;
        description?: string;
        date: string;
        location: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        date: Date;
        location: string;
        organizerId: string;
    }>;
    /**
     * Rota para listagem de todos os eventos do organizador.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        date: Date;
        location: string;
        organizerId: string;
    }[]>;
    /**
     * Rota para criação de lote de ingressos de um evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    createBatch(eventId: string, body: {
        name: string;
        price: number;
        totalQuantity: number;
    }): Promise<{
        id: string;
        price: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        eventId: string;
        totalQuantity: number;
        availableQuantity: number;
    }>;
    /**
     * Rota para listagem de todos os lotes de um determinado evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    findAllBatches(eventId: string): Promise<{
        id: string;
        price: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        eventId: string;
        totalQuantity: number;
        availableQuantity: number;
    }[]>;
}
//# sourceMappingURL=events.controller.d.ts.map