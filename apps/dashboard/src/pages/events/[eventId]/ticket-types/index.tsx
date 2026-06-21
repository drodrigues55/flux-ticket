import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import EventLayout from '../../../../components/EventLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@flux/ui';
import { TicketTypeInfo } from '@flux/types';

export default function TicketTypesPage() {
  const router = useRouter();
  const { eventId } = router.query;

  const [ticketTypes, setTicketTypes] = useState<TicketTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventName, setEventName] = useState('Carregando...');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEventAndTicketTypes = async () => {
    if (!eventId) return;
    try {
        setLoading(true);
        // Fetch event details for header
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) throw new Error('Falha ao recuperar informações do evento.');
        const eventData = await eventRes.json();
        setEventName(eventData.title);

        // Fetch ticket types using our generic proxy
        const typesRes = await fetch(`/api/proxy/events/${eventId}/ticket-types`);
        if (!typesRes.ok) throw new Error('Falha ao recuperar tipos de ingresso.');
        const typesData = await typesRes.json();
        setTicketTypes(typesData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro inesperado ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchEventAndTicketTypes();
  }, [eventId]);

  const handleBatchAction = async (batchId: string, action: string) => {
    try {
      setActionLoading(batchId);
      const res = await fetch(`/api/proxy/batches/${batchId}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Falha ao executar ação: ${action}`);
      await fetchEventAndTicketTypes(); // Refresh data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatReais = (priceInCentavos: number) => {
    const value = priceInCentavos / 100;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <EventLayout eventId={eventId as string} eventName={eventName}>
        <div className="p-12 text-center text-neutral-550 flex flex-col items-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Carregando tipos de ingresso...</span>
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout eventId={eventId as string} eventName={eventName}>
      <div className="space-y-6 mt-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Tipos de Ingresso</h2>
            <p className="text-sm text-neutral-500">Organize os ingressos do seu evento em categorias (ex: Pista, Camarote) e crie lotes dentro de cada categoria.</p>
          </div>
          <Button className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2 px-5 rounded-lg border-none transition-all cursor-pointer shadow-sm text-sm">
            Novo Tipo de Ingresso
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        {ticketTypes.length === 0 && !error ? (
          <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm">
            <CardContent className="p-12 text-center text-neutral-500 space-y-4">
              <p>Você ainda não possui tipos de ingresso para este evento.</p>
              <Button className="border border-[#DCDCDC] text-neutral-700 bg-white hover:bg-neutral-50 px-5 py-2 rounded-lg font-bold transition-all cursor-pointer text-sm">
                Criar Primeiro Tipo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {ticketTypes.map((type) => (
              <Card key={type.id} className="border-[#EAEAEA] bg-white rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="bg-neutral-50 border-b border-[#EAEAEA] flex flex-row items-center justify-between py-4 px-6">
                  <div>
                    <CardTitle className="text-lg font-bold text-neutral-900">{type.name}</CardTitle>
                    {type.description && <CardDescription className="text-neutral-500 mt-1">{type.description}</CardDescription>}
                  </div>
                  <Button className="border border-[#DCDCDC] text-neutral-700 bg-white hover:bg-neutral-100 px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-xs">
                    Novo Lote
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {type.batches.length === 0 ? (
                    <div className="p-6 text-center text-neutral-400 text-sm">Nenhum lote criado para este tipo.</div>
                  ) : (
                    <div className="overflow-x-auto border-none">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="border-b border-[#EAEAEA] text-[11px] font-bold uppercase tracking-wider text-neutral-400 bg-white">
                            <th className="px-6 py-3">Lote</th>
                            <th className="px-6 py-3">Preço</th>
                            <th className="px-6 py-3">Disponíveis / Total</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAEAEA] font-medium text-sm text-neutral-700">
                          {type.batches.map((batch) => {
                            return (
                              <tr key={batch.id} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-neutral-900">{batch.name}</td>
                                <td className="px-6 py-4 text-[#FF3200] font-mono font-bold">{formatReais(batch.price)}</td>
                                <td className="px-6 py-4 text-neutral-600 font-mono">
                                  {batch.availableQuantity} / {batch.totalQuantity}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border ${
                                    batch.status === 'ACTIVE' ? 'bg-[#FF3200]/10 border-[#FF3200]/30 text-[#FF3200]' :
                                    batch.status === 'DRAFT' ? 'bg-neutral-100 border-neutral-300 text-neutral-500' :
                                    batch.status === 'COMPLETED' ? 'bg-green-50 border-green-200 text-green-600' :
                                    'bg-neutral-50 border-neutral-200 text-neutral-500'
                                  }`}>
                                    {batch.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    {batch.status === 'ACTIVE' && (
                                      <>
                                        <button 
                                          onClick={() => handleBatchAction(batch.id, 'pause')}
                                          disabled={actionLoading === batch.id}
                                          className="text-xs text-amber-600 hover:text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200 cursor-pointer transition-colors disabled:opacity-50"
                                        >
                                          Pausar
                                        </button>
                                        <button 
                                          onClick={() => handleBatchAction(batch.id, 'close')}
                                          disabled={actionLoading === batch.id}
                                          className="text-xs text-red-600 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded border border-red-200 cursor-pointer transition-colors disabled:opacity-50"
                                        >
                                          Encerrar
                                        </button>
                                      </>
                                    )}
                                    {batch.status === 'PAUSED' && (
                                      <button 
                                        onClick={() => handleBatchAction(batch.id, 'resume')}
                                        disabled={actionLoading === batch.id}
                                        className="text-xs text-green-600 hover:text-green-700 font-bold bg-green-50 px-2 py-1 rounded border border-green-200 cursor-pointer transition-colors disabled:opacity-50"
                                      >
                                        Retomar
                                      </button>
                                    )}
                                    {['DRAFT', 'COMPLETED', 'PAUSED'].includes(batch.status) && (
                                      <button 
                                        onClick={() => handleBatchAction(batch.id, 'activate-next')}
                                        disabled={actionLoading === batch.id}
                                        className="text-xs text-[#FF3200] hover:text-[#E62D00] font-bold bg-[#FF3200]/10 px-2 py-1 rounded border border-[#FF3200]/30 cursor-pointer transition-colors disabled:opacity-50"
                                        title="Ativar Próximo Lote"
                                      >
                                        Avançar Lote
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </EventLayout>
  );
}
