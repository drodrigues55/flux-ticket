import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/header';
import { FaCalendarDays, FaClock, FaLocationDot, FaPlus, FaMinus } from 'react-icons/fa6';

export default function PublicEventDetailPage() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/events/${slug}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Falha ao carregar detalhes do evento.');
        setEvent(json.data || json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [slug]);

  const handleQtyChange = (batchId: string, delta: number, limit: number) => {
    const current = quantities[batchId] || 0;
    const next = Math.max(0, Math.min(limit, current + delta));
    setQuantities({ ...quantities, [batchId]: next });
  };

  const handleReserve = async (batchId: string, price: number) => {
    const qty = quantities[batchId] || 0;
    if (qty <= 0) return;

    setReserving(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          batchId,
          price,
          quantity: qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Erro ao criar reserva de ingressos.' };

      // Redirect to checkout path
      router.push(`/events/${slug}/checkout?reservationId=${json.reservation.id}&eventId=${event.id}&batchId=${batchId}&quantity=${qty}`);
    } catch (err: any) {
      setError(err.message || 'Falha ao reservar ingressos.');
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03060B] text-white">
        <Header />
        <div className="p-12 text-center text-neutral-400 text-sm">Carregando detalhes do evento...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#03060B] text-white">
        <Header />
        <div className="p-12 text-center text-red-500 text-sm">{error || 'Evento não localizado.'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full space-y-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {event.imageUrl && (
              <div className="w-full h-80 rounded-2xl overflow-hidden bg-neutral-950">
                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-4">
              <h1 className="text-3xl lg:text-4xl font-extrabold">{event.title}</h1>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-neutral-400">
                <div className="flex items-center gap-2">
                  <FaCalendarDays className="text-[#FF3200]" />
                  <span>📅 {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaLocationDot className="text-[#FF3200]" />
                  <span>📍 {event.venue || event.location}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-2">
                <h4 className="font-bold text-lg">Sobre o Evento</h4>
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {event.description || 'Sem descrição cadastrada.'}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Selection Panel */}
          <div className="space-y-4">
            <Card className="rounded-xl bg-neutral-900 border border-white/10 overflow-hidden shadow-xl">
              <div className="bg-neutral-950 p-4 border-b border-white/5 font-bold text-sm text-white">Seleção de Ingressos</div>
              <CardContent className="p-4 space-y-6">
                {event.ticketTypes.length === 0 ? (
                  <div className="text-center text-sm text-neutral-500 py-6">Nenhum ingresso disponível.</div>
                ) : (
                  event.ticketTypes.map((tt: any) => (
                    <div key={tt.id} className="space-y-3">
                      <div className="font-bold text-neutral-200">{tt.name}</div>
                      
                      {tt.batches.map((batch: any) => {
                        const qty = quantities[batch.id] || 0;
                        const isSoldOut = batch.availableQuantity <= 0;
                        return (
                          <div key={batch.id} className="bg-neutral-950/65 p-3 rounded-lg border border-white/5 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-neutral-300">{batch.name}</div>
                              <div className="text-sm font-bold font-mono text-[#FF3200]">
                                {batch.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            </div>

                            {isSoldOut ? (
                              <span className="text-[10px] px-2 py-0.5 bg-red-500/10 border border-red-500/25 text-red-500 rounded font-bold uppercase">
                                Esgotado
                              </span>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-neutral-900">
                                  <button
                                    onClick={() => handleQtyChange(batch.id, -1, tt.purchaseLimit)}
                                    className="p-2 hover:bg-white/5 cursor-pointer text-xs"
                                  >
                                    <FaMinus />
                                  </button>
                                  <span className="px-4 font-mono text-sm">{qty}</span>
                                  <button
                                    onClick={() => handleQtyChange(batch.id, 1, tt.purchaseLimit)}
                                    className="p-2 hover:bg-white/5 cursor-pointer text-xs"
                                  >
                                    <FaPlus />
                                  </button>
                                </div>
                                <button
                                  disabled={qty <= 0 || reserving}
                                  onClick={() => handleReserve(batch.id, batch.price)}
                                  className="h-9 px-4 rounded-lg bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                                >
                                  {reserving ? 'Reservando...' : 'Comprar'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ children, className }: any) {
  return <div className={`border rounded-lg ${className}`}>{children}</div>;
}

function CardContent({ children, className }: any) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
