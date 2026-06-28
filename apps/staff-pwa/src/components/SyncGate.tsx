import { useState, useEffect } from 'react';
import { Button } from '@flux/ui';
import db from '../lib/db';
import { syncOfflineMutations } from '../lib/sync';

interface SyncGateProps {
  eventId: string;
  onSyncComplete: () => void;
}

export function SyncGate({ eventId, onSyncComplete }: SyncGateProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Verifica se o IndexedDB está vazio ou se a última sincronização é superior a 1 hora
  const checkSyncStatus = async () => {
    try {
      const count = await db.validTickets.count();
      const lastSyncStr = localStorage.getItem('flux_last_sync');
      const oneHour = 60 * 60 * 1000; // 1 hora em milissegundos
      
      const isDbEmpty = count === 0;
      const isStale = !lastSyncStr || (Date.now() - parseInt(lastSyncStr, 10)) > oneHour;

      if (isDbEmpty || isStale) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    } catch (err) {
      console.error('Erro ao checar status de sincronização:', err);
      setShowModal(true); // Exibe o modal por segurança
    }
  };

  useEffect(() => {
    checkSyncStatus();
    // Re-checar periodicamente (a cada 30 segundos)
    const interval = setInterval(checkSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncProgress(10);
    setStatusMessage('Sincronizando check-ins offline locais...');

    try {
      // 1. Sincroniza mutações pendentes (POST /api/events/[id]/staff-mutation)
      const mutationResult = await syncOfflineMutations(eventId);
      if (!mutationResult.success && mutationResult.message.includes('Erro na resposta')) {
        throw new Error(mutationResult.message);
      }
      
      setSyncProgress(50);
      setStatusMessage('Baixando carga offline atualizada do servidor...');

      // 2. Busca nova carga do servidor (GET /api/events/[id]/staff-sync)
      const response = await fetch(`/api/events/${eventId}/staff-sync`);
      if (!response.ok) {
        throw new Error(`Falha ao baixar carga offline do servidor: status ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Formato de resposta inválido do servidor.');
      }

      setSyncProgress(75);
      setStatusMessage('Atualizando banco de dados local (IndexedDB)...');

      // Limpa e atualiza o IndexedDB local com a nova carga
      await db.validTickets.clear();
      await db.validTickets.bulkPut(data.map((t: any) => ({
        ticket_id: t.ticket_id,
        hmacSignature: t.hmacSignature,
        sectorId: t.sectorId ?? null
      })));

      setSyncProgress(100);
      setStatusMessage('Sincronização concluída com sucesso!');
      
      // Salva o timestamp da última sincronização bem sucedida
      localStorage.setItem('flux_last_sync', Date.now().toString());
      
      // Delay curto para o usuário visualizar a conclusão
      setTimeout(() => {
        setIsSyncing(false);
        setShowModal(false);
        onSyncComplete();
      }, 800);

    } catch (err: any) {
      console.error('Erro no SyncGate:', err);
      setError(err.message || 'Falha ao sincronizar dados.');
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-6">
      <div className="max-w-md w-full flux-card rounded-[20px] p-8 text-center space-y-6 shadow-2xl relative">
        
        <div className="space-y-2 relative z-10">
          <div className="w-16 h-16 bg-[#FF3200]/10 text-[#FF3200] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-[var(--text)] tracking-tight">Sincronização Obrigatória</h2>
          <p className="text-sm text-[var(--text-subtle)]">
            O banco de dados de validação offline local está vazio ou expirado (último sync há mais de 1 hora). Sincronize com o servidor para continuar operando na portaria.
          </p>
        </div>

        {/* Barra de Progresso */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="h-2 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]">
              <div 
                className="h-full bg-[#FF3200] transition-all duration-300 rounded-full"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-subtle)] font-mono">{syncProgress}% - {statusMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-500/40 text-red-300 text-xs p-4 rounded-lg font-mono break-all text-left">
            <strong>Erro na sincronização:</strong>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="pt-2 relative z-10">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="primary"
            className="w-full py-3 bg-[#FF3200] text-white hover:bg-[#E62D00] font-black tracking-wide rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </div>
      </div>
    </div>
  );
}
