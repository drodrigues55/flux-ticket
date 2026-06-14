import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../components/header';
import { EventCard } from '../components/EventCard';

export default function EventsCatalog() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch('/api/read/events');
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans antialiased text-slate-900">
      <Header />

      {/* HERO SECTION WITH SLANTED/CLIPPED BOTTOM */}
      <section className="bg-gradient-to-br from-[#4A148C] via-[#6200EE] to-[#3700B3] text-white pt-20 pb-12 px-6 relative overflow-hidden">
        {/* Subtle decorative lights to simulate stage overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-purple-500/5 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-black tracking-widest text-[#B388FF] uppercase block">
              VIVA EXPERIÊNCIAS INESQUECÍVEIS
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Os melhores eventos,<br />pertinho de você
            </h1>
            <p className="text-slate-200 text-base md:text-lg max-w-xl font-medium">
              Encontre shows, teatros, esportes e muito mais. Compre com segurança e aproveite cada momento.
            </p>
            
            {/* SEARCH BAR MD3 COMPLIANT */}
            <div className="flex items-center bg-white p-2 rounded-2xl shadow-xl max-w-2xl border border-neutral-200/20">
              <svg className="w-5 h-5 text-slate-400 ml-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text"
                placeholder="Busque por artistas, eventos ou locais" 
                className="flex-grow bg-transparent outline-none text-slate-800 px-2 py-3 text-sm placeholder-neutral-400" 
              />
              <button className="bg-[#6200EE] hover:bg-[#5000c7] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95">
                Buscar
              </button>
            </div>

            {/* CATEGORIES BADGES */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {[
                { label: 'Shows', icon: '🎵' },
                { label: 'Teatro', icon: '🎭' },
                { label: 'Esportes', icon: '⚽' },
                { label: 'Infantis', icon: '😊' },
              ].map((cat, idx) => (
                <button key={idx} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-sm transition-all border border-white/10 cursor-pointer">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Visual stage right panel simulator */}
          <div className="hidden lg:col-span-5 h-80 rounded-3xl bg-[url('https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#4A148C]/90 via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* BENEFIT CARDS SECTION (OVERLAPPING BOTTOM OF HERO) */}
      <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-20 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Compra segura', 
            description: 'Seus dados protegidos do início ao fim.', 
            icon: '🛡️',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600'
          },
          { 
            title: 'Ingressos garantidos', 
            description: 'Receba seus ingressos de forma 100% digital.', 
            icon: '🎫',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600'
          },
          { 
            title: 'Variedade de eventos', 
            description: 'Opções para todos os gostos e idades.', 
            icon: '📅',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600'
          },
          { 
            title: 'Experiências que ficam', 
            description: 'Momentos únicos que você vai lembrar.', 
            icon: '❤️',
            bgColor: 'bg-rose-50',
            textColor: 'text-rose-600'
          }
        ].map((benefit, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100/90 flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 ${benefit.bgColor} ${benefit.textColor}`}>
              {benefit.icon}
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-900">{benefit.title}</h3>
              <p className="text-xs text-slate-500 leading-normal">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* GRID DE EVENTOS */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-grow w-full">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Eventos em Destaque</h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#6200EE] rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Carregando catálogo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map(event => (
              <EventCard
                key={event.id}
                title={event.title}
                date={new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                location={event.location}
                price={
                  event.batches && event.batches.length > 0
                    ? `R$ ${(event.batches[0].price / 100).toFixed(2)}`
                    : "Consultar"
                } 
                onBuy={() => router.push(`/checkout/${event.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer Simples */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-neutral-200/60 max-w-6xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}