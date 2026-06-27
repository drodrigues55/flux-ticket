import { useState, useEffect } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@flux/ui';
import db from '../lib/db';
import { validateTicket } from '../lib/crypto';
import { syncOfflineMutations, setupNetworkSync } from '../lib/sync';
import { SyncGate } from '../components/SyncGate';
import { ScanButton } from '../components/ScanButton';
import { useTheme } from '../hooks/useTheme';
import { getAllowedSectorIds, saveAllowedSectorInput } from '../lib/devicePolicy';

export default function StaffPortal() {
  const { isDark, toggleTheme } = useTheme();
  
  // Staff Auth states
  const [staffName, setStaffName] = useState('');
  const [staffCpf, setStaffCpf] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempCpf, setTempCpf] = useState('');

  // Event selection states
  const [eventId, setEventId] = useState('');
  const [eventName, setEventName] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Layout states
  const [activeTab, setActiveTab] = useState<'scanner' | 'search' | 'sync' | 'stats'>('scanner');
  const [allowedSectorInput, setAllowedSectorInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [scannedInput, setScannedInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Queue states
  const [mutationQueueList, setMutationQueueList] = useState<any[]>([]);

  // Dexie Counters
  const [validTicketsCount, setValidTicketsCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Sync statuses
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Load staff identity and events list on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('flux_staff_name') || '';
      const savedCpf = localStorage.getItem('flux_staff_cpf') || '';
      setStaffName(savedName);
      setStaffCpf(savedCpf);

      const savedEventId = localStorage.getItem('flux_staff_event_id') || '';
      const savedEventName = localStorage.getItem('flux_staff_event_name') || '';
      setEventId(savedEventId);
      setEventName(savedEventName);
    }
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await fetch('/api/events'); // Fetch available events from proxy
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName || !tempCpf) return;
    localStorage.setItem('flux_staff_name', tempName);
    localStorage.setItem('flux_staff_cpf', tempCpf);
    setStaffName(tempName);
    setStaffCpf(tempCpf);
  };

  const handleLogout = () => {
    localStorage.removeItem('flux_staff_name');
    localStorage.removeItem('flux_staff_cpf');
    localStorage.removeItem('flux_staff_event_id');
    localStorage.removeItem('flux_staff_event_name');
    setStaffName('');
    setStaffCpf('');
    setEventId('');
    setEventName('');
  };

  const handleSelectEvent = (id: string, name: string) => {
    localStorage.setItem('flux_staff_event_id', id);
    localStorage.setItem('flux_staff_event_name', name);
    setEventId(id);
    setEventName(name);
  };

  // Update Dexie counters
  const updateCounts = async () => {
    try {
      const ticketsCount = await db.validTickets.count();
      const queueCount = await db.mutationQueue.where('status').equals('PENDING_SYNC').count();
      setValidTicketsCount(ticketsCount);
      setPendingSyncCount(queueCount);

      const queueItems = await db.mutationQueue.toArray();
      setMutationQueueList(queueItems);
    } catch (err) {
      console.error('Erro ao ler contadores do Dexie:', err);
    }
  };

  // Monitor network and setup sync
  useEffect(() => {
    if (typeof window === 'undefined' || !eventId) return;

    setIsOnline(navigator.onLine);
    setAllowedSectorInput(getAllowedSectorIds().join(', '));

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

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

  const handleDownloadTickets = async () => {
    setSyncLoading(true);
    setSyncMessage('Baixando assinaturas criptográficas do servidor...');
    try {
      const response = await fetch(`/api/events/${eventId}/staff-sync`);
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao baixar carga.`);
      }
      const data = await response.json();

      if (Array.isArray(data)) {
        await db.validTickets.clear();
        await db.validTickets.bulkPut(data.map(t => ({
          ticket_id: t.ticket_id,
          hmacSignature: t.hmacSignature,
          sectorId: t.sectorId ?? null
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

  const handleValidateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanResult(null);

    if (!scannedInput.trim()) return;

    const result = await validateTicket(scannedInput);
    setScanResult(result);

    if (result.success) {
      setScannedInput('');
    } else {
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

  const handleCameraScan = async (scannedData: string) => {
    setScanResult(null);
    const result = await validateTicket(scannedData);
    setScanResult(result);

    if (!result.success && isOnline) {
      fetch(`/api/events/${eventId}/scan-fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 })
      }).catch(err => console.error('Falha ao reportar fraude:', err));
    }

    await updateCounts();
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    setSyncMessage('Iniciando sincronização manual em lote...');
    const result = await syncOfflineMutations(eventId);
    setSyncMessage(result.message);
    await updateCounts();
    setSyncLoading(false);
  };

  // Search attendees locally
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await db.validTickets
        .filter(t => t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()))
        .toArray();
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualCheckin = async (ticketId: string, sig: string, sector: number | null) => {
    setScanResult(null);
    const payload = JSON.stringify({
      ticket_id: ticketId,
      buyer_cpf: '00000000000',
      batch_id: 'manual',
      sector_id: sector || undefined,
      signature: sig
    });
    const result = await validateTicket(payload);
    setScanResult(result);
    await updateCounts();
    setActiveTab('scanner');
  };

  const handleFillMockQR = async (type: 'valid' | 'invalid' | 'tampered') => {
    const validMockTicketId = '8ea03604-942c-4597-b1bf-99dc3b1a67fe';
    const validMockSignature = '2b08cf7ae4ec289bca97fc796f321ca1d04d768b567167e4cb3dc0dcb89d8fa3';

    if (type === 'valid') {
      await db.validTickets.put({
        ticket_id: validMockTicketId,
        hmacSignature: validMockSignature,
        sectorId: 1
      });
      await updateCounts();

      setScannedInput(JSON.stringify({
        ticket_id: validMockTicketId,
        buyer_cpf: '12345678909',
        batch_id: 'batch-abc',
        sector_id: 1,
        signature: validMockSignature
      }, null, 2));
    } else if (type === 'invalid') {
      await db.validTickets.delete('ticket-inexistente-xyz');
      await updateCounts();

      setScannedInput(JSON.stringify({
        ticket_id: 'ticket-inexistente-xyz',
        buyer_cpf: '11122233344',
        batch_id: 'batch-xyz',
        signature: 'assinatura-qualquer-123'
      }, null, 2));
    } else {
      await db.validTickets.put({
        ticket_id: validMockTicketId,
        hmacSignature: validMockSignature,
        sectorId: 1
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

  // Staff identification screen
  if (!staffName || !staffCpf) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#03060B] text-white p-6">
        <Card className="max-w-md w-full p-6 bg-neutral-900 border border-white/10 space-y-4">
          <h2 className="text-xl font-bold">Identificação do Operador</h2>
          <p className="text-xs text-neutral-400">Insira seus dados para iniciar as operações de portaria.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-neutral-400">Nome do Operador</span>
              <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-neutral-400">CPF</span>
              <input type="text" value={tempCpf} onChange={e => setTempCpf(e.target.value)} required placeholder="000.000.000-00" className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
            </label>
            <button type="submit" className="w-full h-11 rounded-lg bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold text-sm cursor-pointer">
              Entrar na Portaria
            </button>
          </form>
        </Card>
      </div>
    );
  }

  // Event selection screen
  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#03060B] text-white p-6">
        <div className="max-w-xl mx-auto space-y-6 pt-12">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-bold">Selecionar Evento</h2>
              <p className="text-xs text-neutral-400 mt-1">Operador: {staffName} | CPF: {staffCpf}</p>
            </div>
            <button onClick={handleLogout} className="text-xs text-red-500 font-bold hover:underline cursor-pointer">Sair</button>
          </div>

          <div className="space-y-3">
            {eventsLoading ? (
              <div className="text-center text-sm text-neutral-500 py-6">Buscando eventos...</div>
            ) : events.length === 0 ? (
              <div className="text-center text-sm text-neutral-500 py-6">Nenhum evento localizado.</div>
            ) : (
              events.map((e: any) => (
                <div
                  key={e.id}
                  onClick={() => handleSelectEvent(e.id, e.title)}
                  className="p-4 bg-neutral-900 border border-white/10 rounded-xl hover:border-[#FF3200] cursor-pointer flex justify-between items-center transition-all"
                >
                  <div>
                    <div className="font-bold text-sm text-white">{e.title}</div>
                    <div className="text-xs text-neutral-400 mt-1">📅 {new Date(e.date).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <span className="text-xs font-bold text-[#FF3200]">Acessar Portaria →</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto w-full px-6 py-12 space-y-8 z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">{eventName}</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Operador: <span className="font-bold text-white">{staffName}</span> | CPF: {staffCpf}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isOnline ? (
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />
                Online
              </span>
            ) : (
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs px-3 py-1 rounded-full font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1.5 animate-pulse" />
                Offline
              </span>
            )}
            <button onClick={() => handleLogout()} className="text-xs text-red-500 font-bold hover:underline cursor-pointer">Trocar Evento</button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10">
          {(['scanner', 'search', 'sync', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${
                activeTab === tab ? 'border-[#FF3200] text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab === 'scanner' ? 'Validador' : tab === 'search' ? 'Busca' : tab === 'sync' ? `Sincronização (${pendingSyncCount})` : 'Estatísticas'}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Work Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {activeTab === 'scanner' && (
              <div className="space-y-6">
                <Card className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Validador de Portaria</CardTitle>
                    <CardDescription className="text-neutral-400">Escaneie o QR Code ou insira os dados no painel de simulação.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
                    {scanResult ? (
                      <div className={`w-full p-6 border rounded-xl flex items-start space-x-4 ${
                        scanResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg">
                            {scanResult.success ? 'Acesso Liberado!' : 'Acesso Recusado!'}
                          </h4>
                          <p className="text-sm opacity-90">{scanResult.message}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-neutral-500 border-2 border-dashed border-white/10 rounded-xl w-full flex flex-col items-center justify-center">
                        <p className="text-sm">Nenhum ingresso validado recentemente.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Simulated QR Input details */}
                <details className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden group">
                  <summary className="p-4 cursor-pointer text-xs font-bold text-neutral-400 hover:text-white flex justify-between items-center select-none bg-neutral-950/40">
                    <span>Simulador de QR Code</span>
                    <span>▼</span>
                  </summary>
                  <div className="p-4 border-t border-white/10 space-y-4">
                    <form onSubmit={handleValidateScan} className="space-y-4">
                      <textarea
                        value={scannedInput}
                        onChange={e => setScannedInput(e.target.value)}
                        placeholder='{ "ticket_id": "...", "signature": "..." }'
                        rows={5}
                        className="w-full bg-neutral-950 border border-white/10 rounded-lg p-4 text-xs font-mono text-white placeholder-neutral-600"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleFillMockQR('valid')} className="flex-1 py-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20 cursor-pointer">
                          QR Válido
                        </button>
                        <button type="button" onClick={() => handleFillMockQR('invalid')} className="flex-1 py-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 cursor-pointer">
                          QR Inválido
                        </button>
                        <button type="button" onClick={() => handleFillMockQR('tampered')} className="flex-1 py-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20 cursor-pointer">
                          QR Adulterado
                        </button>
                      </div>
                      <button type="submit" className="w-full h-11 rounded-lg bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold text-sm cursor-pointer">
                        Validar Simulação (Check-in)
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            )}

            {activeTab === 'search' && (
              <Card className="bg-neutral-900 border border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Manual Attendee Lookup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Pesquisar por Código do Ingresso..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-grow h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white"
                    />
                    <button type="submit" className="px-6 h-11 rounded-lg bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold text-sm cursor-pointer">
                      Buscar
                    </button>
                  </form>

                  <div className="divide-y divide-white/5 pt-2">
                    {searchResults.length === 0 ? (
                      <p className="text-center text-xs text-neutral-500 py-4">Nenhum ingresso localizado localmente.</p>
                    ) : (
                      searchResults.map(ticket => (
                        <div key={ticket.ticket_id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-neutral-300">{ticket.ticket_id}</div>
                            <div className="text-[10px] text-neutral-500 mt-0.5">Setor: {ticket.sectorId || 'Geral'}</div>
                          </div>
                          <button
                            onClick={() => handleManualCheckin(ticket.ticket_id, ticket.hmacSignature, ticket.sectorId)}
                            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded font-bold cursor-pointer"
                          >
                            Check-in
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'sync' && (
              <Card className="bg-neutral-900 border border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Fila de Sincronização Local</CardTitle>
                  <CardDescription className="text-neutral-400">Verifique os check-ins pendentes de envio ao servidor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={handleManualSync}
                      disabled={pendingSyncCount === 0 || !isOnline}
                      className="w-full h-11 rounded-lg bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold text-sm disabled:opacity-50 cursor-pointer"
                    >
                      Sincronizar Filas Agora
                    </button>
                  </div>

                  <div className="divide-y divide-white/5 pt-2">
                    {mutationQueueList.length === 0 ? (
                      <p className="text-center text-xs text-neutral-500 py-4">Fila limpa. Todos os dados sincronizados.</p>
                    ) : (
                      mutationQueueList.map(item => (
                        <div key={item.ticket_id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold block text-neutral-300">{item.ticket_id}</span>
                            <span className="text-[10px] text-neutral-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-bold uppercase">
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'stats' && (
              <Card className="bg-neutral-900 border border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Estatísticas da Portaria</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 text-center">
                    <span className="block text-2xl font-mono font-bold text-[#FF3200]">{validTicketsCount}</span>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Total Offline</span>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 text-center">
                    <span className="block text-2xl font-mono font-bold text-amber-400">{pendingSyncCount}</span>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Pendentes Sync</span>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Sync status sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-neutral-900 border border-white/10 rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-bold text-neutral-200">Sincronização Offline</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <button
                  onClick={handleDownloadTickets}
                  disabled={syncLoading || !isOnline}
                  className="w-full h-11 rounded-lg border border-white/10 bg-transparent hover:bg-white/5 text-white font-bold text-xs cursor-pointer"
                >
                  Baixar Assinaturas Offline
                </button>
                {syncMessage && (
                  <p className="text-[10px] font-mono text-neutral-400 break-all bg-neutral-950 p-3 rounded border border-white/5 leading-relaxed">
                    {syncMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

        </main>
      </div>

      <SyncGate eventId={eventId} onSyncComplete={updateCounts} />
      <ScanButton onScan={handleCameraScan} />
    </div>
  );
}
