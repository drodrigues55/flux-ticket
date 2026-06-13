import db from './db';

/**
 * Envia todos os check-ins offline pendentes de sincronização para o servidor.
 */
export async function syncOfflineMutations(eventId: string): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const pending = await db.mutationQueue
      .where('status')
      .equals('PENDING_SYNC')
      .toArray();

    if (pending.length === 0) {
      return { success: true, count: 0, message: 'Nenhum check-in pendente de sincronização.' };
    }

    const ticketIds = pending.map(record => record.ticket_id);
    console.log(`[SYNC] Tentando sincronizar ${ticketIds.length} check-ins para o evento ${eventId}...`);

    // Faz a chamada para a nossa rota de API Next.js que atua como proxy para a api-write
    const response = await fetch(`/api/events/${eventId}/staff-mutation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketIds }),
    });

    if (!response.ok) {
      throw new Error(`Erro na resposta do servidor: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      // Sincronização com sucesso: podemos deletar os registros processados da fila local
      await db.mutationQueue.bulkDelete(ticketIds);
      console.log(`[SYNC] ${ticketIds.length} check-ins sincronizados com sucesso.`);
      return {
        success: true,
        count: ticketIds.length,
        message: `${ticketIds.length} check-ins sincronizados com o servidor relacional.`,
      };
    } else {
      throw new Error('Sincronização rejeitada pelo backend.');
    }
  } catch (error: any) {
    console.error('[SYNC ERROR] Falha ao sincronizar check-ins offline:', error);
    return {
      success: false,
      count: 0,
      message: `Erro na sincronização de dados: ${error.message || error}`,
    };
  }
}

/**
 * Registra o listener no evento 'online' da janela para disparar a sincronização automática.
 */
export function setupNetworkSync(eventId: string, onSyncComplete?: (result: any) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('[SYNC ENGINE] Conexão com a Internet detectada! Iniciando sincronização em lote...');
    const result = await syncOfflineMutations(eventId);
    if (onSyncComplete) {
      onSyncComplete(result);
    }
  };

  window.addEventListener('online', handleOnline);

  // Retorna uma função de limpeza para desmontar o listener
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
