import { FluxEngineService } from '../tickets/flux-engine.service';
export declare class EventsService {
    private readonly fluxEngine;
    private readonly logger;
    constructor(fluxEngine: FluxEngineService);
    /**
     * Cria um novo evento vinculando-o ao organizerId recebido do JWT.
     */
    createEvent(data: {
        title: string;
        description?: string;
        date: string;
        location: string;
        categoryId?: number;
    }, organizerId: string): Promise<{
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
     * Lista todos os eventos pertencentes ao organizador autenticado.
     */
    findAllEvents(organizerId: string): Promise<{
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
     * Cria um novo lote de ingressos de forma consistente.
     * Inicializa o estoque no Redis e faz rollback no Postgres se falhar.
     * Converte o preço de reais para centavos inteiros.
     */
    createBatch(eventId: string, data: {
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
     * Lista todos os lotes cadastrados para um determinado evento.
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
//# sourceMappingURL=events.service.d.ts.map