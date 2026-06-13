import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input } from '@flux/ui';

export default function CreateEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { title, description, date, time, location } = formData;

    if (!title || !date || !time || !location) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    // Combina data e hora em uma única string ISO
    const combinedDateTime = new Date(`${date}T${time}`).toISOString();

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          date: combinedDateTime,
          location,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao cadastrar evento no servidor.');
      }

      // Redireciona para a lista após criação
      router.push('/events');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Novo Evento</h1>
          <p className="text-sm text-neutral-400 mt-1">Preencha os dados do show para abrir as vendas de ingressos.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-neutral-850">
          <CardHeader>
            <CardTitle>Dados Básicos do Show</CardTitle>
            <CardDescription>Estes dados serão exibidos no portal público do consumidor.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Título do Evento *</label>
                <Input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Mega Show Concorrente"
                  required
                  disabled={loading}
                  className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Descrição</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detalhes adicionais sobre a atração ou regras do evento..."
                  rows={4}
                  disabled={loading}
                  className="w-full bg-[#1A1A1A] border border-neutral-800 rounded-lg p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Data do Evento *</label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Hora de Início *</label>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Localização / Arena *</label>
                <Input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ex: Arena Digital, São Paulo - SP"
                  required
                  disabled={loading}
                  className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1"
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center pt-4 border-t border-neutral-800 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/events')}
                disabled={loading}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Evento'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
