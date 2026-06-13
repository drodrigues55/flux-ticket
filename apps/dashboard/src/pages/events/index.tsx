import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@flux/ui';
import Link from 'next/link';

interface EventData {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
}

export default function EventsListPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Falha ao recuperar eventos do servidor.');
      }
      const data = await response.json();
      setEvents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getStatusBadge = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    
    if (eventDate > today) {
      return (
        <span className="bg-cosmic-neon/10 border border-cosmic-neon/30 text-cosmic-neon text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          Agendado
        </span>
      );
    }
    return (
      <span className="bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
        Encerrado
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Meus Eventos</h1>
            <p className="text-sm text-neutral-400 mt-1">Gerencie a venda de ingressos dos seus eventos ativos.</p>
          </div>

          <Link href="/events/new" legacyBehavior>
            <Button variant="primary">Criar Novo Evento</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-neutral-850 overflow-hidden">
          <CardHeader>
            <CardTitle>Catálogo de Shows</CardTitle>
            <CardDescription>Lista de eventos criados e vinculados à sua conta de organizador.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center space-y-3">
                <svg className="animate-spin h-8 w-8 text-cosmic-neon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Carregando eventos...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 space-y-4 bg-cosmic-slate rounded-lg border border-cosmic-grey">
                <p className="text-base font-semibold">Nenhum evento cadastrado para a sua conta.</p>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto">Comece a cadastrar seus shows agora mesmo para habilitar a venda de ingressos com alta concorrência.</p>
                <Link href="/events/new" legacyBehavior>
                  <Button variant="primary" size="md" className="mt-2">Criar Primeiro Evento</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto border border-cosmic-grey rounded-lg">
                <table className="w-full text-left border-collapse bg-cosmic-slate">
                  <thead>
                    <tr className="border-b border-cosmic-grey text-xs font-bold uppercase tracking-wider text-neutral-400 bg-neutral-950/30">
                      <th className="px-6 py-4">Nome do Evento</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Localização</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cosmic-grey/60 font-medium text-sm">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-neutral-800/35 transition-all duration-150">
                        <td className="px-6 py-4">
                          <Link href={`/events/${event.id}`} legacyBehavior>
                            <a className="text-white font-bold text-base hover:text-cosmic-neon transition-colors cursor-pointer">
                              {event.title}
                            </a>
                          </Link>
                          {event.description && (
                            <div className="text-neutral-400 text-xs mt-0.5 line-clamp-1">{event.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-neutral-300 font-mono">
                          {new Date(event.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-neutral-300">{event.location}</td>
                        <td className="px-6 py-4">{getStatusBadge(event.date)}</td>
                      </tr>
                    ))}
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
