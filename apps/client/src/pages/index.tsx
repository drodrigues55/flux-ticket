import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Button } from '@flux/ui';
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Header />

      {/* Hero Section idêntica à imagem */}
      <section className="bg-gradient-to-br from-[#6200EE] to-[#3700B3] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-4">Os melhores eventos,<br />pertinho de você</h1>
          <div className="flex bg-white p-2 rounded-full max-w-lg mt-8">
            <input className="flex-1 px-6 text-slate-800 bg-transparent outline-none" placeholder="Busque por artistas..." />
            <button className="bg-[#6200EE] px-8 py-3 rounded-full font-bold">Buscar</button>
          </div>
        </div>
      </section>

      {/* Grid de Cards */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {events.map(event => (
            <EventCard
              key={event.id}
              title={event.title}
              date={new Date(event.date).toLocaleDateString()}
              location={event.location}
              price={
                event.batches && event.batches.length > 0
                  ? `R$ ${(event.batches[0].price / 100).toFixed(2)}`
                  : "Consultar"
              } onBuy={() => router.push(`/checkout/${event.id}`)}
            />
          ))}
        </div>
      </main>

      {/* Footer Simples */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-neutral-100">
        &copy; {new Date().getFullYear()} Flux Ticketss. Todos os direitos reservados.
      </footer>
    </div>
  );
}