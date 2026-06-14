import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { prisma } from '@flux/database';
import { FluxEngineService } from '../tickets/flux-engine.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly fluxEngine: FluxEngineService) {}

  /**
   * Cria um novo evento vinculando-o ao organizerId recebido do JWT.
   */
  async createEvent(
    data: { title: string; description?: string; date: string; location: string; categoryId?: number },
    organizerId: string
  ) {
    return prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        location: data.location,
        categoryId: data.categoryId,
        organizerId: organizerId,
      },
    });
  }

  /**
   * Lista todos os eventos pertencentes ao organizador autenticado.
   */
  async findAllEvents(organizerId: string) {
    return prisma.event.findMany({
      where: {
        organizerId: organizerId,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Cria um novo lote de ingressos de forma consistente.
   * Inicializa o estoque no Redis e faz rollback no Postgres se falhar.
   * Converte o preço de reais para centavos inteiros.
   */
  async createBatch(
    eventId: string,
    data: { name: string; price: number; totalQuantity: number; sectorId?: number; sectorName?: string }
  ) {
    // 2. Gravação relacional no PostgreSQL (salva em valor decimal normal)
    const batch = await prisma.ticketBatch.create({
      data: {
        eventId: eventId,
        name: data.name,
        price: data.price,
        totalQuantity: data.totalQuantity,
        availableQuantity: data.totalQuantity,
        sectorId: data.sectorId,
        sectorName: data.sectorName || data.name,
      },
    });

    // 3. Inicialização de estoque no cache Redis
    try {
      await this.fluxEngine.setBatchStock(batch.id, data.totalQuantity);
      this.logger.log(`[BATCH SYNC] Estoque do lote ${batch.id} (${data.name}) de ${data.totalQuantity} vagas inicializado no Redis Cluster.`);
      return batch;
    } catch (error) {
      this.logger.error(`[BATCH SYNC ERROR] Falha ao sincronizar lote ${batch.id} com o Redis. Executando compensação relacional...`, error);
      
      // Ação de compensação: Remove do PostgreSQL relacional
      try {
        await prisma.ticketBatch.delete({
          where: { id: batch.id },
        });
      } catch (dbError) {
        this.logger.error(`[COMPENSATION FATAL] Falha ao remover lote órfão ${batch.id} do banco relacional!`, dbError);
      }

      throw new InternalServerErrorException('Falha crítica de comunicação com o cluster de cache. O lote não pôde ser criado.');
    }
  }

  /**
   * Lista todos os lotes cadastrados para um determinado evento.
   */
  async findAllBatches(eventId: string) {
    return prisma.ticketBatch.findMany({
      where: {
        eventId: eventId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
