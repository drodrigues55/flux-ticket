import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../components/header';
import { EventCard } from '../components/EventCard';
import {
  FaMusic,
  FaMasksTheater,
  FaFutbol,
  FaFaceSmile
} from 'react-icons/fa6';

const EVENT_DECORATIONS: Record<string, { imageUrl: string; badge?: string; isTrending?: boolean }> = {
  'Bee Gees Alive - Anapolis': {
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=600',
    badge: 'Tributo Especial',
    isTrending: false,
  },
  'Rock in Rio 2026': {
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=600',
    badge: 'Últimos Ingressos',
    isTrending: true,
  },
  'Coldplay | Music of the Spheres': {
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=600',
    badge: 'Data Extra Adicionada',
    isTrending: true,
  },
  'Hamlet - O Musical': {
    imageUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&q=80&w=600',
    badge: 'Clássico Imperial',
    isTrending: false,
  },
  'Chicago - O Musical': {
    imageUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&q=80&w=600',
    badge: 'Sucesso de Bilheteria',
    isTrending: true,
  },
  'Final da Copa do Brasil 2026': {
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600',
    badge: 'Alta Demanda',
    isTrending: true,
  },
  'UFC Fight Night Brasil': {
    imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&q=80&w=600',
    badge: 'Cadeira VIP Disponível',
    isTrending: false,
  },
  'Turma da Mônica em Cena': {
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
    badge: 'Diversão em Família',
    isTrending: false,
  },
  'Galinha Pintadinha ao Vivo': {
    imageUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&q=80&w=600',
    badge: 'Para Crianças',
    isTrending: false,
  },
};

const CATEGORY_FALLBACK_IMAGES: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=600', // Shows
  2: 'https://images.unsplash.com/photo-1503095391755-1414e86720d0?auto=format&fit=crop&q=80&w=600', // Teatro
  3: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=600', // Esportes
  4: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=600', // Infantis
};

function getEventDecorations(event: any) {
  const dec = EVENT_DECORATIONS[event.title];
  if (dec) return dec;
  return {
    imageUrl: CATEGORY_FALLBACK_IMAGES[event.categoryId] || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=600',
    badge: undefined,
    isTrending: false
  };
}

export default function EventsCatalog() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const eventsRef = useRef<HTMLElement>(null);

  const handleSearchSubmit = () => {
    const sanitized = searchTerm.replace(/[<>'"&/]/g, '').trim();
    setActiveSearch(sanitized);
  };

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const url = selectedCategory
          ? `/api/read/events?categoryId=${selectedCategory}`
          : '/api/read/events';
        const response = await fetch(url);
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [selectedCategory]);

  const filteredEvents = Array.isArray(events) ? events.filter(event => {
    if (!activeSearch) return true;
    const query = activeSearch.toLowerCase();
    return (
      (event.title && event.title.toLowerCase().includes(query)) ||
      (event.location && event.location.toLowerCase().includes(query))
    );
  }) : [];

  // Redireciona para a página dedicada do evento se o eventId vier na query string
  useEffect(() => {
    if (!router.isReady) return;
    const { eventId } = router.query;
    if (eventId) {
      router.replace(`/event/${eventId}`);
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex flex-col flux-page font-sans antialiased relative overflow-hidden">
      <Header />

      {/* HERO SECTION - Minimalist Light Mode */}
      <section className="flux-surface pt-24 pb-12 px-6 relative border-b">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center justify-center space-y-6">
          <div className="space-y-4">
            <span className="text-xs font-semibold tracking-wide text-[#FF3200] block">
              Descubra & Viva
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.2] text-[var(--text)]">
              Sua próxima experiência <br />inesquecível começa aqui
            </h1>
            <p className="mx-auto text-[var(--text-muted)] text-base md:text-lg max-w-xl font-light">
              Encontre shows, teatros, esportes e muito mais. Compre com segurança e aproveite cada momento.
            </p>
          </div>

          {/* SEARCH BAR - Light theme standard input */}
          <div className="flex items-center bg-[var(--surface-muted)] p-1.5 rounded-[14px] shadow-sm w-full max-w-2xl border border-[var(--border-strong)] mx-auto transition-all focus-within:border-[#FF3200] focus-within:ring-2 focus-within:ring-[#FF3200]/10">
            <svg className="w-5 h-5 text-[var(--text-subtle)] ml-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Busque por artistas, eventos ou locais"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              className="flex-grow bg-transparent outline-none text-[var(--text)] px-2 py-3 text-sm placeholder-[var(--text-subtle)]"
            />
            <button
              onClick={handleSearchSubmit}
              className="bg-[#FF3200] hover:bg-[#E62D00] text-white px-8 py-3 rounded-[10px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer text-sm"
            >
              Buscar
            </button>
          </div>

          {/* CATEGORIES BADGES - Minimalist Light styling */}
          <div id="filtros-categoria" className="flex flex-wrap justify-center gap-2.5 pt-2">
            {[
              { id: 1, label: 'Shows', icon: <FaMusic className="text-[13px]" /> },
              { id: 2, label: 'Teatro', icon: <FaMasksTheater className="text-[13px]" /> },
              { id: 3, label: 'Esportes', icon: <FaFutbol className="text-[13px]" /> },
              { id: 4, label: 'Infantis', icon: <FaFaceSmile className="text-[13px]" /> },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={(e) => {
                    e.preventDefault();
                    const nextCategory = isActive ? null : cat.id;
                    setSelectedCategory(nextCategory);

                    const filtrosEl = document.getElementById('filtros-categoria');
                    if (filtrosEl) {
                      const rect = filtrosEl.getBoundingClientRect();
                      if (Math.abs(rect.top - 72) > 10) {
                        const targetY = window.pageYOffset + rect.top - 72;
                        window.scrollTo({ top: targetY, behavior: 'smooth' });
                      }
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold transition-all border cursor-pointer ${isActive
                    ? 'bg-[#FF3200] text-white border-[#FF3200] shadow-sm scale-105'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* GRID DE EVENTOS */}
      <main id="eventos" ref={eventsRef} className="max-w-7xl mx-auto px-6 pt-8 pb-16 flex-grow w-full min-h-[600px] space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-neutral-200 border-t-[#FF3200] rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[var(--text-subtle)]">Carregando catálogo...</p>
          </div>
        ) : (
          <>
            {/* Seção Trending Now */}
            {!selectedCategory && !activeSearch && (
              <div>
                <h2 className="text-2xl font-black text-[var(--text)] mb-6 tracking-tight">
                  Trending Now
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredEvents
                    .filter(event => getEventDecorations(event).isTrending)
                    .map(event => {
                      const dec = getEventDecorations(event);
                      return (
                        <EventCard
                          key={`trending-${event.id}`}
                          title={event.title}
                          date={new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          location={event.location}
                          price={
                            event.batches && event.batches.length > 0
                              ? `R$ ${Math.min(...event.batches.map((b: any) => Number(b.price))).toFixed(2).replace('.', ',')}`
                              : "Consultar"
                          }
                          imageUrl={dec.imageUrl}
                          badge={dec.badge}
                          onBuy={() => router.push(`/event/${event.id}`)}
                        />
                      );
                    })}
                </div>
              </div>
            )}

            {/* Seção Listagem Geral */}
            <div>
              <h2 className="text-2xl font-black text-[var(--text)] mb-6 tracking-tight">
                {activeSearch
                  ? `Resultados para: "${activeSearch}"`
                  : (selectedCategory ? 'Eventos Encontrados' : 'Todos os Eventos')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredEvents.map(event => {
                  const dec = getEventDecorations(event);
                  return (
                    <EventCard
                      key={event.id}
                      title={event.title}
                      date={new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      location={event.location}
                      price={
                        event.batches && event.batches.length > 0
                          ? `R$ ${Math.min(...event.batches.map((b: any) => Number(b.price))).toFixed(2).replace('.', ',')}`
                          : "Consultar"
                      }
                      imageUrl={dec.imageUrl}
                      badge={dec.badge}
                      onBuy={() => router.push(`/event/${event.id}`)}
                    />
                  );
                })}
              </div>
              {filteredEvents.length === 0 && (
                <div className="text-center py-12 text-[var(--text-subtle)] font-light">
                  Nenhum evento encontrado para a busca realizada.
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[var(--text-subtle)] text-sm border-t border-[var(--border)] max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}
