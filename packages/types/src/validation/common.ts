import { z } from 'zod';

// Validação simples de CPF (Apenas checagem de formato para exemplo, expansível futuramente)
export const cpfSchema = z.string().regex(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, 'CPF inválido. Use o formato 000.000.000-00');

export const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}\-\d{4}$/, 'Telefone inválido. Use (00) 00000-0000');

export const zipCodeSchema = z.string().regex(/^\d{5}\-\d{3}$/, 'CEP inválido. Use 00000-000');

// Monetary validation in cents or just a positive number
export const moneySchema = z.coerce.number().min(0, 'O valor não pode ser negativo');
