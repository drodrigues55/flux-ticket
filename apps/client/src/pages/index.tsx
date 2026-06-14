import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@flux/ui';

interface TicketBatch {
  id: string;
  name: string;
  price: number; // em centavos no banco
  availableQuantity: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  batches?: TicketBatch[];
}

export default function EventsCatalog() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch('/api/read/events');
        if (!response.ok) {
          throw new Error('Falha ao obter o catálogo de eventos');
        }
        const data = await response.json();
        setEvents(data);
      } catch (err: any) {
        console.error('[CLIENT ERROR] Failed to load catalog events:', err);
        setError(err.message || 'Erro de rede ao carregar eventos.');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const handleVerIngressos = (eventId: string) => {
    // Redireciona o usuário para a página de checkout correspondente
    router.push(`/checkout/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-cosmic-dark text-white p-6 md:p-12 relative flex flex-col justify-between">
      {/* Background neon grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#00E5FF_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-cosmic-grey pb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight animate-neon-glow text-center md:text-left bg-gradient-to-r from-white via-neutral-100 to-cosmic-neon bg-clip-text text-transparent">
              Flux Tickets
            </h1>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-bold text-center md:text-left">
              Vitrine Oficial de Eventos Concorrentes
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-cosmic-slate border border-cosmic-grey px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-cosmic-neon animate-pulse" />
            <span className="text-xs font-semibold text-neutral-300">Conectado ao FluxEngine</span>
          </div>
        </header>

        <main className="space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-cosmic-neon/30 border-t-cosmic-neon rounded-full animate-spin" />
              <p className="text-sm font-semibold text-neutral-400 tracking-wider">Carregando shows e eventos...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-center space-y-4">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mx-auto border-red-500/30 text-red-400 hover:border-red-500 hover:bg-red-500/10">
                Tentar Novamente
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-cosmic-slate border border-cosmic-grey p-12 rounded-xl text-center space-y-4">
              <p className="text-neutral-400 text-sm font-semibold">Nenhum evento disponível no momento.</p>
              <p className="text-xs text-neutral-500">Volte mais tarde ou confira com o organizador.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => {
                // Pega o lote mais barato para mostrar "Ingressos a partir de"
                const cheapestBatch = event.batches && event.batches.length > 0
                  ? [...event.batches].sort((a, b) => a.price - b.price)[0]
                  : null;

                const formattedPrice = cheapestBatch
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cheapestBatch.price / 100)
                  : null;

                return (
                  <Card key={event.id} className="border-cosmic-grey bg-cosmic-slate rounded-xl hover:border-cosmic-neon/40 transition-all duration-300 flex flex-col justify-between h-full group hover:shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-xl group-hover:text-cosmic-neon transition-colors duration-200">{event.title}</CardTitle>
                      <CardDescription className="flex items-center text-xs text-neutral-400 gap-1.5 pt-1">
                        <svg className="w-4 h-4 text-cosmic-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 flex-grow">
                      <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">{event.description}</p>
                      <div className="flex items-center text-xs text-neutral-500 gap-1.5">
                        <svg className="w-4 h-4 text-cosmic-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-semibold text-neutral-400">{event.location}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4 pt-4 border-t border-cosmic-grey">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Valor do lote</span>
                        <span className="text-sm font-bold text-cosmic-neon">
                          {formattedPrice ? `A partir de ${formattedPrice}` : 'Preço sob consulta'}
                        </span>
                      </div>
                      <Button 
                        onClick={() => handleVerIngressos(event.id)} 
                        variant="primary" 
                        className="w-full bg-cosmic-neon text-[#121212] hover:bg-[#00d8f0] hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all font-bold"
                      >
                        Ver Ingressos
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <footer className="text-center text-[10px] text-neutral-600 mt-16 tracking-wider uppercase font-bold py-6 border-t border-cosmic-grey relative z-10 max-w-6xl mx-auto w-full">
        <p>&copy; {new Date().getFullYear()} Flux Engine. Todos os direitos reservados. Alta Escala Transacional.</p>
      </footer>
    </div>
  );
}
