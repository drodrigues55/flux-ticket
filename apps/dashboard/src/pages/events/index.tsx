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
        <span className="bg-[#FF3200]/10 border border-[#FF3200]/30 text-[#FF3200] text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
          Agendado
        </span>
      );
    }
    return (
      <span className="bg-neutral-100 border border-neutral-300 text-neutral-500 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
        Encerrado
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-8 bg-[#FAFAFA]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Meus Eventos</h1>
            <p className="text-sm text-neutral-500 mt-1">Gerencie a venda de ingressos dos seus eventos ativos.</p>
          </div>

          <Link href="/events/new" legacyBehavior>
            <Button className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2 px-5 rounded-full border-none transition-all cursor-pointer">Criar Novo Evento</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-[#EAEAEA] bg-white overflow-hidden rounded-xl shadow-sm">
          <CardHeader className="border-b border-[#EAEAEA]">
            <CardTitle className="text-neutral-950 font-bold text-lg">Catálogo de Shows</CardTitle>
            <CardDescription className="text-neutral-500 text-sm">Lista de eventos criados e vinculados à sua conta de organizador.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-neutral-500 flex flex-col items-center space-y-3 bg-white">
                <svg className="animate-spin h-8 w-8 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Carregando eventos...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 space-y-4 bg-white rounded-lg">
                <p className="text-base font-semibold text-neutral-850">Nenhum evento cadastrado para a sua conta.</p>
                <p className="text-sm text-neutral-450 max-w-sm mx-auto">Comece a cadastrar seus shows agora mesmo para habilitar a venda de ingressos com alta concorrência.</p>
                <Link href="/events/new" legacyBehavior>
                  <Button className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2.5 px-6 rounded-full border-none transition-all cursor-pointer">Criar Primeiro Evento</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto border-none">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-xs font-bold uppercase tracking-wider text-neutral-500 bg-neutral-50/50">
                      <th className="px-6 py-4">Nome do Evento</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Localização</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] font-medium text-sm text-neutral-700">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-neutral-50/50 transition-all duration-150">
                        <td className="px-6 py-4">
                          <Link href={`/events/${event.id}`} legacyBehavior>
                            <a className="text-[#FF3200] hover:text-[#E62D00] font-bold text-base transition-colors cursor-pointer">
                              {event.title}
                            </a>
                          </Link>
                          {event.description && (
                            <div className="text-neutral-450 text-xs mt-0.5 line-clamp-1">{event.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-neutral-600 font-mono">
                          {new Date(event.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-neutral-600">{event.location}</td>
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
