import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import EventLayout from '../../../components/EventLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@flux/ui';
import Link from 'next/link';

interface EventData {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
}

interface BatchData {
  id: string;
  name: string;
  price: number; // in centavos
  totalQuantity: number;
  availableQuantity: number;
}

export default function EventDetailsPage() {
  const router = useRouter();
  const { eventId } = router.query;

  const [event, setEvent] = useState<EventData | null>(null);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;

    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) {
          throw new Error('Falha ao recuperar informações do evento.');
        }
        const eventData = await eventRes.json();
        setEvent(eventData);

        const batchesRes = await fetch(`/api/events/${eventId}/batches`);
        if (!batchesRes.ok) {
          throw new Error('Falha ao recuperar lotes de ingressos.');
        }
        const batchesData = await batchesRes.json();
        setBatches(batchesData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro inesperado.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId]);

  const formatReais = (priceInCentavos: number) => {
    const value = priceInCentavos / 100;
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading) {
    return (
      <EventLayout eventId={eventId as string} eventName="Carregando...">
        <div className="p-12 text-center text-neutral-550 flex flex-col items-center space-y-3 bg-[#FAFAFA]">
          <svg className="animate-spin h-8 w-8 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Carregando detalhes do evento...</span>
        </div>
      </EventLayout>
    );
  }

  if (error || !event) {
    return (
      <EventLayout eventId={eventId as string} eventName="Erro">
        <div className="space-y-6 max-w-2xl mx-auto bg-[#FAFAFA]">
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error || 'Evento não encontrado.'}
          </div>
          <Link href="/events" legacyBehavior>
            <Button className="border border-[#DCDCDC] text-neutral-700 bg-white hover:bg-neutral-50 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer">Voltar para Eventos</Button>
          </Link>
        </div>
      </EventLayout>
    );
  }

  return (
      <EventLayout eventId={event.id} eventName={event.title}>
        <div className="space-y-8 bg-[#FAFAFA] mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm p-6 col-span-2">
              <h2 className="text-neutral-500 text-xs uppercase tracking-wider font-bold mb-4">Detalhes do Evento</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-450 uppercase font-bold tracking-wider">Localização</label>
                  <p className="text-neutral-900 font-medium text-sm mt-1">{event.location}</p>
                </div>
                <div>
                  <label className="text-xs text-neutral-450 uppercase font-bold tracking-wider">Data</label>
                  <p className="text-neutral-900 font-medium text-sm mt-1">
                    {new Date(event.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {event.description && (
                  <div>
                    <label className="text-xs text-neutral-450 uppercase font-bold tracking-wider">Descrição</label>
                    <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed text-sm mt-1">{event.description}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-neutral-500 text-xs uppercase tracking-wider font-bold mb-4">Ações Rápidas</h2>
              <div className="flex flex-col gap-3">
                <Link href={`/events/${event.id}/ticket-types`} legacyBehavior>
                  <Button className="w-full bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2 rounded-lg border-none transition-all cursor-pointer shadow-sm text-sm">
                    Gerenciar Tipos de Ingresso
                  </Button>
                </Link>
                <Link href={`/events/${event.id}/edit`} legacyBehavior>
                  <Button className="w-full border border-[#DCDCDC] text-neutral-700 bg-white hover:bg-neutral-50 py-2 rounded-lg font-bold transition-all cursor-pointer text-sm">
                    Editar Informações
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </EventLayout>
  );
}
