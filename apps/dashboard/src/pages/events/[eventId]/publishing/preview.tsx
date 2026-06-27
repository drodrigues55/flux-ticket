import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import EventLayout from '../../../../components/EventLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@flux/ui';

export default function EventPreviewPage() {
  const router = useRouter();
  const { eventId } = router.query as { eventId: string };

  const [eventName, setEventName] = useState('Carregando...');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const loadData = async () => {
      try {
        const eventRes = await fetch(`/api/organizer/events/${eventId}`);
        const eventJson = await eventRes.json();
        if (eventRes.ok && eventJson.data) {
          setEventName(eventJson.data.event.name);
        }

        const res = await fetch(`/api/organizer/events/${eventId}/publishing/preview`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Falha ao carregar preview do evento.');
        setPreview(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

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
          <Link href={`/events/${eventId}/publishing/checklist`} className="text-sm font-bold text-neutral-500 hover:text-neutral-700">
            ← Voltar para Checklist
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">Visualização Pública</h1>
          <p className="text-xs text-neutral-500">Esta tela mostra como a página do evento aparecerá para os compradores no app.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Consumer facing mock page */}
            <div className="md:col-span-2 space-y-6">
              {/* Event Image Banner */}
              {preview.event.imageUrl ? (
                <div className="w-full h-64 rounded-xl overflow-hidden bg-neutral-100 relative">
                  <img src={preview.event.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-48 rounded-xl bg-neutral-100 flex items-center justify-center border-2 border-dashed border-neutral-300 text-neutral-400 text-sm">
                  Nenhuma imagem cadastrada
                </div>
              )}

              {/* Title & Desc */}
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-neutral-900">{preview.event.name}</h2>
                <div className="flex gap-4 text-sm text-neutral-500">
                  <div>📅 {new Date(preview.event.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div>📍 {preview.event.venue || preview.event.location || 'Online'}</div>
                </div>
                <p className="text-sm text-neutral-700 pt-4 leading-relaxed whitespace-pre-line">
                  {preview.event.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>
            </div>

            {/* Ticket buying sidebar mock */}
            <div className="space-y-4">
              <Card className="rounded-xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
                <div className="bg-neutral-900 p-4 text-white font-bold text-sm">Ingressos Disponíveis</div>
                <CardContent className="p-4 divide-y divide-neutral-100">
                  {preview.tickets.length === 0 ? (
                    <div className="py-4 text-center text-sm text-neutral-500">Nenhum ingresso disponível.</div>
                  ) : (
                    preview.tickets.map((t: any) => (
                      <div key={t.id} className="py-4 flex justify-between items-center text-sm">
                        <div>
                          <div className="font-bold text-neutral-900">{t.name}</div>
                          <div className="text-xs text-neutral-400 mt-0.5">Capacidade: {t.capacity}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-bold text-[#FF3200] font-mono">
                            {t.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 space-y-1">
                  <span className="font-bold block">Avisos do Preview:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {preview.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </EventLayout>
  );
}
