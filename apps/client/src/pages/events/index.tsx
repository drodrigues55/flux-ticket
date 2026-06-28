import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../../components/header';
import { EventCard } from '../../components/EventCard';
import { FaFaceSmile, FaFutbol, FaMagnifyingGlass, FaMasksTheater, FaMusic } from 'react-icons/fa6';
import { track } from '../../lib/analytics';

const categories = [
  { id: 1, label: 'Shows', icon: <FaMusic className="text-[13px]" /> },
  { id: 2, label: 'Teatro', icon: <FaMasksTheater className="text-[13px]" /> },
  { id: 3, label: 'Esportes', icon: <FaFutbol className="text-[13px]" /> },
  { id: 4, label: 'Infantil', icon: <FaFaceSmile className="text-[13px]" /> },
];

const categoryFallbackImages: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=600',
  2: 'https://images.unsplash.com/photo-1503095391755-1414e86720d0?auto=format&fit=crop&q=80&w=600',
  3: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=600',
  4: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=600',
};

const formatPrice = (event: any) => {
  if (event.startingPrice !== null && event.startingPrice !== undefined) {
    return Number(event.startingPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (event.batches?.length) {
    const price = Math.min(...event.batches.map((batch: any) => Number(batch.price)));
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return 'Consultar';
};

const getEventImage = (event: any) => {
  return event.imageUrl || categoryFallbackImages[event.categoryId] || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=600';
};

export default function PublicEventsCatalog() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const url = selectedCategory
        ? `/api/public/events?categoryId=${selectedCategory}`
        : '/api/public/events';
      const res = await fetch(url);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      track({ event: 'public_event_list_viewed', properties: { status: res.ok ? 'loaded' : 'failed' } });
    } catch (err) {
      console.error(err);
      setEvents([]);
      track({ event: 'public_event_list_viewed', properties: { status: 'failed' } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  useEffect(() => {
    if (!router.isReady) return;
    const search = typeof router.query.search === 'string' ? router.query.search : '';
    setSearchTerm(search);
    setActiveSearch(search);
  }, [router.isReady, router.query.search]);

  const handleSearch = () => {
    const sanitized = searchTerm.replace(/[<>'"&/]/g, '').trim();
    setActiveSearch(sanitized);
  };

  const filteredEvents = events.filter((event) => {
    if (!activeSearch) return true;
    const query = activeSearch.toLowerCase();
    return (
      event.title?.toLowerCase().includes(query) ||
      event.venue?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  });

  const heading = activeSearch
    ? `Resultados para "${activeSearch}"`
    : selectedCategory
      ? categories.find((category) => category.id === selectedCategory)?.label || 'Eventos encontrados'
      : 'Todos os eventos';

  return (
    <div className="min-h-screen flex flex-col flux-page font-sans antialiased">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12 space-y-8">
        <section className="flux-card p-6 md:p-8 rounded-[20px] shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wide text-[#FF3200]">Catalogo</span>
              <h1 className="text-3xl font-black tracking-tight text-[var(--text)]">Eventos</h1>
              <p className="text-sm text-[var(--text-muted)] max-w-2xl">
                Encontre eventos publicados, filtre por categoria e continue para a pagina de ingressos.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <div className="relative">
                <FaMagnifyingGlass className="absolute left-4 top-3.5 w-4 h-4 text-[var(--text-subtle)]" />
                <input
                  type="text"
                  placeholder="Buscar eventos, locais ou artistas"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  className="flux-input w-full pl-11 pr-24 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="absolute right-1.5 top-1.5 bg-[#FF3200] hover:bg-[#E62D00] text-white px-4 py-2 rounded-[10px] text-xs font-bold transition-colors"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(isActive ? null : category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FF3200] text-white border-[#FF3200]'
                      : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {category.icon}
                  {category.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-[var(--text)]">{heading}</h2>
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                {loading ? 'Atualizando catalogo...' : `${filteredEvents.length} evento${filteredEvents.length === 1 ? '' : 's'} encontrado${filteredEvents.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flux-card p-8 rounded-[20px] text-center text-sm font-semibold text-[var(--text-muted)]">
              Carregando eventos...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flux-card p-8 rounded-[20px] text-center text-sm font-semibold text-[var(--text-muted)]">
              Nenhum evento localizado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  date={new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  location={event.venue || event.location || 'Local a confirmar'}
                  price={formatPrice(event)}
                  imageUrl={getEventImage(event)}
                  onBuy={() => {
                    track({
                      event: 'ticket_selected',
                      properties: {
                        eventId: event.id,
                        eventSlug: event.slug || null,
                        status: 'catalog_card',
                      },
                    });
                    router.push(event.slug ? `/events/${event.slug}` : `/event/${event.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
