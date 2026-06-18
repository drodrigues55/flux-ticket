import { useState, useEffect } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@flux/ui';
import db from '../lib/db';
import { validateTicket } from '../lib/crypto';
import { syncOfflineMutations, setupNetworkSync } from '../lib/sync';
import { SyncGate } from '../components/SyncGate';
import { ScanButton } from '../components/ScanButton';
import { useTheme } from '../hooks/useTheme';

export default function StaffPortal() {
  const { isDark, toggleTheme } = useTheme();
  const [eventId, setEventId] = useState('event-id-123');
  const [isOnline, setIsOnline] = useState(true);
  const [scannedInput, setScannedInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Contadores locais do IndexedDB
  const [validTicketsCount, setValidTicketsCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Status de carregamento e mensagens
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Atualiza os contadores do Dexie
  const updateCounts = async () => {
    try {
      const ticketsCount = await db.validTickets.count();
      const queueCount = await db.mutationQueue.where('status').equals('PENDING_SYNC').count();
      setValidTicketsCount(ticketsCount);
      setPendingSyncCount(queueCount);
    } catch (err) {
      console.error('Erro ao ler contadores do Dexie:', err);
    }
  };

  // Monitora status de conexão e registra sincronizador automático
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Registra a sincronização automática em lote ao recuperar rede
    const cleanupSync = setupNetworkSync(eventId, (result) => {
      setSyncMessage(result.message);
      updateCounts();
    });

    updateCounts();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      cleanupSync();
    };
  }, [eventId]);

  // Sincroniza a carga de assinaturas do backend (GET /api/events/:id/staff-sync)
  const handleDownloadTickets = async () => {
    setSyncLoading(true);
    setSyncMessage('Baixando assinaturas criptográficas do servidor...');
    try {
      const response = await fetch(`/api/events/${eventId}/staff-sync`);
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao baixar carga.`);
      }
      const data = await response.json(); // Array de { ticket_id, hmacSignature }

      if (Array.isArray(data)) {
        // Limpa o banco local anterior e insere em lote os novos ingressos válidos
        await db.validTickets.clear();
        await db.validTickets.bulkPut(data.map(t => ({
          ticket_id: t.ticket_id,
          hmacSignature: t.hmacSignature
        })));
        setSyncMessage(`Sucesso! ${data.length} assinaturas de ingressos salvas offline.`);
        await updateCounts();
      } else {
        throw new Error('Formato de resposta inesperado do servidor.');
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar carga offline:', error);
      setSyncMessage(`Falha no download: ${error.message || error}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Valida o QR Code escaneado (simulado via Input de texto)
  const handleValidateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanResult(null);

    if (!scannedInput.trim()) return;

    const result = await validateTicket(scannedInput);
    setScanResult(result);

    if (result.success) {
      setScannedInput(''); // Limpa o campo em caso de sucesso
    } else {
      // Relata falha de validação/fraude para o servidor
      if (isOnline) {
        fetch(`/api/events/${eventId}/scan-fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 1 })
        }).catch(err => console.error('Falha ao reportar fraude:', err));
      }
    }

    await updateCounts();
  };

  // Valida o QR Code escaneado via câmera
  const handleCameraScan = async (scannedData: string) => {
    setScanResult(null);
    const result = await validateTicket(scannedData);
    setScanResult(result);

    if (!result.success) {
      // Relata falha de validação/fraude para o servidor
      if (isOnline) {
        fetch(`/api/events/${eventId}/scan-fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 1 })
        }).catch(err => console.error('Falha ao reportar fraude:', err));
      }
    }

    await updateCounts();
  };


  // Sincroniza manualmente as mutações pendentes
  const handleManualSync = async () => {
    setSyncLoading(true);
    setSyncMessage('Iniciando sincronização manual em lote...');
    const result = await syncOfflineMutations(eventId);
    setSyncMessage(result.message);
    await updateCounts();
    setSyncLoading(false);
  };

  // Preenche dados simulados de QR Code para facilidade de testes
  const handleFillMockQR = async (type: 'valid' | 'invalid' | 'tampered') => {
    const validMockTicketId = '8ea03604-942c-4597-b1bf-99dc3b1a67fe';
    const validMockSignature = '2b08cf7ae4ec289bca97fc796f321ca1d04d768b567167e4cb3dc0dcb89d8fa3';

    if (type === 'valid') {
      // Garante que o ingresso de teste esteja registrado localmente como válido
      await db.validTickets.put({
        ticket_id: validMockTicketId,
        hmacSignature: validMockSignature
      });
      await updateCounts();

      setScannedInput(JSON.stringify({
        ticket_id: validMockTicketId,
        buyer_cpf: '12345678909',
        batch_id: 'batch-abc',
        signature: validMockSignature
      }, null, 2));
    } else if (type === 'invalid') {
      // Remove o ingresso do banco local para garantir que seja detectado como não cadastrado
      await db.validTickets.delete('ticket-inexistente-xyz');
      await updateCounts();

      setScannedInput(JSON.stringify({
        ticket_id: 'ticket-inexistente-xyz',
        buyer_cpf: '11122233344',
        batch_id: 'batch-xyz',
        signature: 'assinatura-qualquer-123'
      }, null, 2));
    } else {
      // Insere o ingresso com a assinatura válida local, mas no QR escaneado passamos uma assinatura inválida/forjada
      await db.validTickets.put({
        ticket_id: validMockTicketId,
        hmacSignature: validMockSignature
      });
      await updateCounts();

      setScannedInput(JSON.stringify({
        ticket_id: validMockTicketId,
        buyer_cpf: '12345678909',
        batch_id: 'batch-abc',
        signature: 'assinatura-adulterada-forjada'
      }, null, 2));
    }
  };

  return (
    <div className="min-h-screen flux-page p-6 md:p-12 relative flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full relative z-10 space-y-8 my-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--border)] pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--text)]">
              Flux Portaria PWA
            </h1>
            <p className="text-xs text-[var(--text-subtle)] mt-1 tracking-wide font-bold">
              Edge Validation Client - Offline Gate Control
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flux-theme-toggle"
              title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
              aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.42-1.42M7.05 7.05 5.64 5.64m12.72 0-1.42 1.41M7.05 16.95l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <span className="text-sm font-semibold text-[var(--text)]">Conectividade:</span>
            {isOnline ? (
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs px-3 py-1.5 rounded-full font-bold tracking-wide flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />
                Online
              </span>
            ) : (
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs px-3 py-1.5 rounded-full font-bold tracking-wide flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block mr-1.5 animate-pulse" />
                Offline (Borda local)
              </span>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Sincronização e Configurações */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="flux-card">
              <CardHeader>
                <CardTitle className="text-lg">Configuração do Evento</CardTitle>
                <CardDescription>Defina o evento e baixe a carga offline antes do início.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wide text-[var(--text-subtle)]">ID do Evento</label>
                  <Input
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="Ex: event-id-123"
                    className="flux-input"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleDownloadTickets}
                    variant="outline"
                    className="w-full"
                    disabled={syncLoading || !isOnline}
                  >
                    Baixar Carga Offline (Sync)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flux-card">
              <CardHeader>
                <CardTitle className="text-lg">Status do Banco Local (IndexedDB)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flux-muted-surface p-4 rounded-lg border text-center">
                  <span className="block text-2xl font-mono font-black text-[#FF3200]">
                    {validTicketsCount}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-subtle)] tracking-wide">
                    Assinaturas Offline
                  </span>
                </div>
                <div className="flux-muted-surface p-4 rounded-lg border text-center">
                  <span className="block text-2xl font-mono font-black text-amber-400">
                    {pendingSyncCount}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-subtle)] tracking-wide">
                    Check-ins Pendentes
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  onClick={handleManualSync}
                  variant="primary"
                  className="w-full"
                  disabled={syncLoading || pendingSyncCount === 0 || !isOnline}
                >
                  Sincronizar Filas Agora
                </Button>
              </CardFooter>
            </Card>

            {syncMessage && (
              <div className="flux-card text-xs p-4 rounded-lg text-[var(--text-muted)] font-mono break-all shadow-md">
                {syncMessage}
              </div>
            )}
          </div>

          {/* Coluna Direita: Validador QR Code & Câmera */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="flux-card relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">Validador de Portaria</CardTitle>
                <CardDescription>Toque no botão de câmera flutuante abaixo para iniciar a validação.</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
                {scanResult ? (
                  <div className={`w-full p-6 border rounded-xl flex items-start space-x-4 ${scanResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    <div className={`p-2 rounded-lg ${scanResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                      {scanResult.success ? (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">
                        {scanResult.success ? 'Acesso Liberado!' : 'Acesso Recusado!'}
                      </h4>
                      <p className="text-sm opacity-90">{scanResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--text-subtle)] border-2 border-dashed border-[var(--border-strong)] rounded-xl w-full flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-neutral-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="text-sm">Nenhum ingresso validado recentemente.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Debug Panel colapsável */}
            <details className="flux-card overflow-hidden group">
              <summary className="p-4 cursor-pointer text-xs font-bold tracking-wide text-[var(--text-subtle)] hover:text-[var(--text)] select-none flex justify-between items-center flux-muted-surface">
                <span>Painel de Debug (Simulador de QR)</span>
                <span className="text-[10px] text-neutral-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 border-t border-[var(--border)] space-y-4">
                <form onSubmit={handleValidateScan} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-wide text-[var(--text-subtle)]">Dados do QR Code (JSON)</label>
                    <textarea
                      value={scannedInput}
                      onChange={(e) => setScannedInput(e.target.value)}
                      placeholder='{ "ticket_id": "...", "buyer_cpf": "...", "batch_id": "...", "signature": "..." }'
                      rows={5}
                      className="flux-input w-full rounded-lg p-4 text-xs font-mono placeholder-[var(--text-subtle)]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => handleFillMockQR('valid')}
                      variant="outline"
                      size="sm"
                      className="border-emerald-500/30 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all font-semibold"
                    >
                      Preencher QR Válido
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleFillMockQR('invalid')}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all font-semibold"
                    >
                      Preencher QR Não Cadastrado
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleFillMockQR('tampered')}
                      variant="outline"
                      size="sm"
                      className="border-amber-500/30 text-amber-600 hover:border-amber-500 hover:bg-amber-500/10 transition-all font-semibold"
                    >
                      Preencher QR Adulterado
                    </Button>
                  </div>
                  <Button type="submit" variant="primary" className="w-full py-3">
                    Validar Ingresso (Check-in)
                  </Button>
                </form>
              </div>
            </details>
          </div>
        </main>
      </div>

      <footer className="text-center text-xs text-[var(--text-subtle)] py-6 relative z-10">
        <p>&copy; {new Date().getFullYear()} Flux Ticketss - Portaria Offline. Todos os direitos reservados.</p>
      </footer>

      <SyncGate eventId={eventId} onSyncComplete={updateCounts} />
      <ScanButton onScan={handleCameraScan} />
    </div>
  );
}
