// Definições de tipo compartilhadas para o projeto Flux
export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
}
