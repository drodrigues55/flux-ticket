import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
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
        // Fetch event info
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) {
          throw new Error('Falha ao recuperar informações do evento.');
        }
        const eventData = await eventRes.json();
        setEvent(eventData);

        // Fetch batches
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
      <Layout>
        <div className="p-12 text-center text-neutral-500 flex flex-col items-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-cosmic-neon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Carregando detalhes do evento...</span>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-lg">
            {error || 'Evento não encontrado.'}
          </div>
          <Link href="/events" legacyBehavior>
            <Button variant="outline">Voltar para Eventos</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-bold uppercase tracking-wider mb-2">
              <Link href="/events" className="hover:text-white transition-colors">Eventos</Link>
              <span>/</span>
              <span className="text-cosmic-neon">Detalhes</span>
            </div>
            <h1 className="text-3xl font-black text-white">{event.title}</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {event.location} &bull; {new Date(event.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/events" legacyBehavior>
              <Button variant="ghost">Voltar</Button>
            </Link>
            <Link href={`/events/${event.id}/batches/new`} legacyBehavior>
              <Button variant="primary">Criar Novo Lote</Button>
            </Link>
          </div>
        </div>

        {/* Event Meta Card */}
        {event.description && (
          <Card className="border-neutral-850 bg-neutral-900/40">
            <CardHeader>
              <CardTitle className="text-sm text-neutral-400 uppercase tracking-wider">Descrição do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-300 whitespace-pre-wrap">{event.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Batches Table Card */}
        <Card className="border-neutral-850 overflow-hidden">
          <CardHeader>
            <CardTitle>Lotes de Ingressos</CardTitle>
            <CardDescription>Gerencie as faixas de preço e quantidades de ingressos para este evento.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {batches.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 space-y-4">
                <p>Nenhum lote cadastrado para este evento.</p>
                <Link href={`/events/${event.id}/batches/new`} legacyBehavior>
                  <Button variant="outline" size="sm">Criar Primeiro Lote</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto border border-cosmic-grey rounded-lg">
                <table className="w-full text-left border-collapse bg-cosmic-slate">
                  <thead>
                    <tr className="border-b border-cosmic-grey text-xs font-bold uppercase tracking-wider text-neutral-400 bg-neutral-950/30">
                      <th className="px-6 py-4">Nome do Lote</th>
                      <th className="px-6 py-4">Preço</th>
                      <th className="px-6 py-4">Ingressos Vendidos / Total</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cosmic-grey/60 font-medium text-sm">
                    {batches.map((batch) => {
                      const sold = batch.totalQuantity - batch.availableQuantity;
                      const isSoldOut = batch.availableQuantity === 0;

                      return (
                        <tr key={batch.id} className="hover:bg-neutral-800/20 transition-all duration-150">
                          <td className="px-6 py-4">
                            <div className="text-white font-bold text-base">{batch.name}</div>
                          </td>
                          <td className="px-6 py-4 text-cosmic-neon font-mono font-bold text-base">
                            {formatReais(batch.price)}
                          </td>
                          <td className="px-6 py-4 text-neutral-300 font-mono">
                            {sold} / {batch.totalQuantity}
                          </td>
                          <td className="px-6 py-4">
                            {isSoldOut ? (
                              <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                Esgotado
                              </span>
                            ) : (
                              <span className="bg-cosmic-neon/10 border border-cosmic-neon/30 text-cosmic-neon text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                                Ativo
                              </span>
                            )}
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
      </div>
    </Layout>
  );
}
