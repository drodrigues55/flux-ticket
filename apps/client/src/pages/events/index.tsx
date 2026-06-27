import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/header';
import { FaMusic, FaMasksTheater, FaFutbol, FaFaceSmile } from 'react-icons/fa6';

export default function PublicEventsCatalog() {
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
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const filteredEvents = events.filter(e => {
    if (!activeSearch) return true;
    const query = activeSearch.toLowerCase();
    return (
      e.title.toLowerCase().includes(query) ||
      (e.location && e.location.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full space-y-8 z-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Eventos em Destaque</h1>
          <p className="text-neutral-400 text-sm max-w-md mx-auto">Compre seus ingressos com total segurança e praticidade.</p>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-neutral-900 border border-white/10 rounded-full px-4 py-2 w-full max-w-md">
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setActiveSearch(searchTerm); }}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-neutral-500"
            />
            <button onClick={() => setActiveSearch(searchTerm)} className="text-xs font-bold text-[#FF3200]">Buscar</button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { id: 1, label: 'Shows', icon: <FaMusic /> },
              { id: 2, label: 'Teatro', icon: <FaMasksTheater /> },
              { id: 3, label: 'Esportes', icon: <FaFutbol /> },
              { id: 4, label: 'Infantil', icon: <FaFaceSmile /> },
            ].map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    isActive ? 'bg-[#FF3200] text-white border-[#FF3200]' : 'bg-transparent border-white/10 text-neutral-400'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event List */}
        {loading ? (
          <div className="text-center text-sm text-neutral-400 py-12">Carregando eventos...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center text-sm text-neutral-500 py-12">Nenhum evento localizado.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <div key={event.id} className="group bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF3200]/50 transition-all duration-300">
                {event.imageUrl && (
                  <div className="h-44 w-full overflow-hidden bg-neutral-950">
                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                  </div>
                )}
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#FF3200] transition-colors">{event.title}</h3>
                    <p className="text-xs text-neutral-400">📅 {new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-xs text-neutral-400">📍 {event.venue || event.location}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    {event.startingPrice !== null ? (
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase">A partir de</span>
                        <span className="text-sm font-bold font-mono text-[#FF3200]">{event.startingPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">Gratuito / Esgotado</span>
                    )}
                    <Link href={`/events/${event.slug}`}>
                      <button className="bg-neutral-800 hover:bg-[#FF3200] hover:text-white text-neutral-300 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer">
                        Ver Ingressos
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
