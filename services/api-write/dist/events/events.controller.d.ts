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
        categoryId?: number;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string | null;
        date: Date;
        location: string;
        categoryId: number | null;
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
        categoryId: number | null;
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
        sectorId?: number;
        sectorName?: string;
    }): Promise<{
        id: string;
        name: string;
        price: import("@prisma/client/runtime/library").Decimal;
        totalQuantity: number;
        availableQuantity: number;
        sectorId: number | null;
        sectorName: string | null;
        meiaEntrada: boolean;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Rota para listagem de todos os lotes de um determinado evento.
     * Exige token JWT com role STAFF/ORGANIZER.
     */
    findAllBatches(eventId: string): Promise<{
        id: string;
        name: string;
        price: import("@prisma/client/runtime/library").Decimal;
        totalQuantity: number;
        availableQuantity: number;
        sectorId: number | null;
        sectorName: string | null;
        meiaEntrada: boolean;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
}
//# sourceMappingURL=events.controller.d.ts.map