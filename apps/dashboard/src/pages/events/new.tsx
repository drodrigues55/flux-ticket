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
      <div className="max-w-2xl mx-auto space-y-6 bg-[#FAFAFA]">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Novo Evento</h1>
          <p className="text-sm text-neutral-500 mt-1">Preencha os dados do show para abrir as vendas de ingressos.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm">
          <CardHeader className="border-b border-[#EAEAEA]">
            <CardTitle className="text-neutral-900 font-bold text-lg">Dados Básicos do Show</CardTitle>
            <CardDescription className="text-neutral-500 text-sm">Estes dados serão exibidos no portal público do consumidor.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Título do Evento *</label>
                <Input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Mega Show Concorrente"
                  required
                  disabled={loading}
                  className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Descrição</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detalhes adicionais sobre a atração ou regras do evento..."
                  rows={4}
                  disabled={loading}
                  className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-2xl p-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10 transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Data do Evento *</label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Hora de Início *</label>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Localização / Arena *</label>
                <Input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ex: Arena Digital, São Paulo - SP"
                  required
                  disabled={loading}
                  className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center pt-4 border-t border-[#EAEAEA] mt-6">
              <button
                type="button"
                onClick={() => router.push('/events')}
                disabled={loading}
                className="bg-transparent hover:bg-neutral-100 text-neutral-550 font-bold px-6 py-2.5 rounded-full border-none transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2.5 px-6 rounded-full border-none transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {loading ? 'Salvando...' : 'Salvar Evento'}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
