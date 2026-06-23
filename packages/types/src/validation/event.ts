import { z } from 'zod';

export const EventSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  date: z.string().min(1, 'A data de início é obrigatória.'),
  time: z.string().min(1, 'A hora de início é obrigatória.'),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(3, 'A localização é obrigatória.'),
});

// Outras validações relacionadas a eventos (ex: Ticket Batch) podem vir aqui
export const TicketBatchSchema = z.object({
  name: z.string().min(1, 'O nome do lote é obrigatório'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo'),
  quantity: z.coerce.number().int().min(1, 'A quantidade deve ser pelo menos 1'),
});
