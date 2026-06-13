import { useEffect, useState, useRef } from 'react';

export interface UseTicketLockOptions {
  userId: string;
  ticketId: string;
  eventId: string;
  onExpired: () => void;
}

/**
 * Hook customizado para gerenciar a contagem regressiva do ingresso e disparar
 * renovações periódicas (heartbeats) para evitar que o lock expire no Redis.
 */
export function useTicketLock({ userId, ticketId, eventId, onExpired }: UseTicketLockOptions) {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutos em segundos
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  // Contagem regressiva de segundo em segundo
  useEffect(() => {
    if (timeLeft <= 0) {
      onExpiredRef.current();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Heartbeat de renovação a cada 50 segundos
  useEffect(() => {
    const renewLock = async () => {
      try {
        const response = await fetch('/api/tickets/renew-lock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, ticketId }),
        });

        if (!response.ok) {
          throw new Error('Falha na resposta do servidor.');
        }

        const data = await response.json();
        if (data.success) {
          console.log('[HEARTBEAT] Lock estendido com sucesso no Redis.');
          // Reseta a contagem regressiva visual de 3 minutos
          setTimeLeft(180);
        } else {
          throw new Error('Lock expirado ou inválido.');
        }
      } catch (error) {
        console.error('[HEARTBEAT] Falha ao renovar o lock do ingresso:', error);
        onExpiredRef.current();
      }
    };

    // Agenda a renovação a cada 50 segundos
    const heartbeatInterval = setInterval(renewLock, 50 * 1000);

    return () => clearInterval(heartbeatInterval);
  }, [userId, ticketId]);

  return {
    timeLeft,
    formattedTime: `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`,
  };
}
