import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import EventLayout from '../../../components/EventLayout';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@flux/ui';

export default function EditEventPage() {
  const router = useRouter();
  const { eventId } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
  });

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('Falha ao carregar dados do evento.');
        const data = await res.json();
        
        // Format date for datetime-local input
        let formattedDate = '';
        if (data.date) {
          const d = new Date(data.date);
          formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }

        setFormData({
          title: data.title || '',
          description: data.description || '',
          location: data.location || '',
          date: formattedDate,
        });
      } catch (err: any) {
        setError(err.message || 'Erro inesperado.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/proxy/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          date: new Date(formData.date).toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Falha ao salvar as alterações do evento.');
      
      setSuccess('Evento atualizado com sucesso!');
      
      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EventLayout eventId={eventId as string} eventName="Carregando...">
        <div className="p-12 text-center text-neutral-550 flex flex-col items-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Carregando formulário...</span>
        </div>
      </EventLayout>
    );
  }

  return (
    <EventLayout eventId={eventId as string} eventName={formData.title}>
      <div className="space-y-6 mt-6 max-w-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Editar Evento</h2>
            <p className="text-sm text-neutral-500">Atualize as informações gerais e configurações do seu evento.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm p-4 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm">
            <CardHeader className="border-b border-[#EAEAEA]">
              <CardTitle className="text-sm text-neutral-500 uppercase tracking-wider font-bold">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-900 block">Nome do Evento</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full h-11 border border-neutral-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#FF3200] focus:border-transparent transition-all"
                  placeholder="Ex: Baile do Fluxo 2026"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900 block">Data e Hora</label>
                  <input
                    type="datetime-local"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full h-11 border border-neutral-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#FF3200] focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-900 block">Localização</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full h-11 border border-neutral-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#FF3200] focus:border-transparent transition-all"
                    placeholder="Ex: Arena Corinthians, SP"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-900 block">Descrição</label>
                <textarea
                  name="description"
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF3200] focus:border-transparent transition-all resize-y"
                  placeholder="Forneça os detalhes principais sobre as atrações, regras e o que esperar do evento..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={() => router.push(`/events/${eventId}`)}
              disabled={saving}
              className="border border-[#DCDCDC] text-neutral-700 bg-white hover:bg-neutral-50 px-6 py-2.5 rounded-lg font-bold transition-all cursor-pointer text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2.5 px-8 rounded-lg border-none transition-all cursor-pointer shadow-sm text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </EventLayout>
  );
}
