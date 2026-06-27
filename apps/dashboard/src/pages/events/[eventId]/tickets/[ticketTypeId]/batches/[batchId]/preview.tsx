import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import EventLayout from '../../../../../../../components/EventLayout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@flux/ui';

export default function BatchPreviewPage() {
  const router = useRouter();
  const { eventId, ticketTypeId, batchId } = router.query as { eventId: string; ticketTypeId: string; batchId: string };

  const [eventName, setEventName] = useState('Carregando...');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !ticketTypeId || !batchId) return;

    const loadData = async () => {
      try {
        const eventRes = await fetch(`/api/organizer/events/${eventId}`);
        const eventJson = await eventRes.json();
        if (eventRes.ok && eventJson.data) {
          setEventName(eventJson.data.event.name);
        }

        const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches/${batchId}/preview`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Falha ao carregar preview do lote.');
        setPreview(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, ticketTypeId, batchId]);

  if (loading) {
    return (
      <EventLayout eventId={eventId} eventName={eventName}>
        <div className="p-8 text-sm text-neutral-500">Carregando preview...</div>
      </EventLayout>
    );
  }

  return (
    <EventLayout eventId={eventId} eventName={eventName}>
      <div className="space-y-6 mt-4">
        <div>
          <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches`} className="text-sm font-bold text-neutral-500 hover:text-neutral-700">
            ← Voltar para Lotes
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">Visualização Prévia do Comprador</h1>
          <p className="text-xs text-neutral-500">Esta tela simula a aparência do lote para os compradores finais.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Visual ticket preview for customer */}
            <div className="md:col-span-2 space-y-4">
              <Card className="rounded-xl bg-[#FDFDFD] border border-neutral-200 overflow-hidden shadow-sm">
                <div className="bg-neutral-900 px-6 py-4 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Tipo de Ingresso</span>
                  <h3 className="text-lg font-bold">{preview.ticketTypeName}</h3>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-extrabold text-neutral-900">{preview.batchName}</h4>
                      <p className="text-xs text-neutral-500 mt-1">Período de vendas: {preview.salesWindow}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 font-bold uppercase">Preço unitário</div>
                      <div className="text-2xl font-extrabold text-[#FF3200] font-mono mt-0.5">
                        {preview.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      preview.currentSellableState ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {preview.availability}
                    </span>
                    <Button disabled={!preview.currentSellableState}>
                      Comprar Ingresso
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {!preview.currentSellableState && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 space-y-2">
                  <h4 className="font-bold">Motivos de bloqueio da venda deste lote:</h4>
                  <ul className="list-disc list-inside space-y-0.5">
                    {preview.blockingReasons.map((reason: string, i: number) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Side metadata panel */}
            <div className="space-y-4">
              <Card className="rounded-lg bg-white border border-neutral-200">
                <CardHeader><CardTitle>Status Interno</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Visível no app:</span>
                    <span className="font-bold">{preview.visibility ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Estado de venda:</span>
                    <span className="font-bold">{preview.currentSellableState ? 'Habilitado' : 'Bloqueado'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </EventLayout>
  );
}
