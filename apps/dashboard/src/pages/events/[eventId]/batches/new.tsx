import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input } from '@flux/ui';
import Link from 'next/link';

interface EventData {
  id: string;
  title: string;
}

export default function CreateBatchPage() {
  const router = useRouter();
  const { eventId } = router.query;

  const [event, setEvent] = useState<EventData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    totalQuantity: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoadingEvent(true);
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          throw new Error('Falha ao recuperar informações do evento.');
        }
        const data = await res.json();
        setEvent(data);
      } catch (err: any) {
        console.error(err);
        setError('Evento não encontrado.');
      } finally {
        setLoadingEvent(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { name, price, totalQuantity } = formData;

    if (!name || !price || !totalQuantity) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    const priceNum = parseFloat(price);
    const qtyNum = parseInt(totalQuantity, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Por favor, insira um preço válido (maior ou igual a 0).');
      setLoading(false);
      return;
    }

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('A quantidade total deve ser um número inteiro maior que 0.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          price: priceNum,
          totalQuantity: qtyNum,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao cadastrar o lote no servidor.');
      }

      router.push(`/events/${eventId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao cadastrar lote.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingEvent) {
    return (
      <Layout>
        <div className="p-12 text-center text-neutral-500 flex flex-col items-center space-y-3 bg-[#FAFAFA]">
          <svg className="animate-spin h-8 w-8 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Carregando informações do evento...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 bg-[#FAFAFA]">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-550 font-bold uppercase tracking-wider mb-2">
            <Link href="/events" className="hover:text-[#FF3200] transition-colors">Eventos</Link>
            <span>/</span>
            <Link href={`/events/${eventId}`} className="hover:text-[#FF3200] transition-colors">{event?.title || 'Detalhes'}</Link>
            <span>/</span>
            <span className="text-[#FF3200]">Novo Lote</span>
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Criar Lote de Ingressos</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure o preço e a quantidade inicial de ingressos para o evento "{event?.title}".</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <Card className="border-[#EAEAEA] bg-white rounded-xl shadow-sm">
          <CardHeader className="border-b border-[#EAEAEA]">
            <CardTitle className="text-neutral-900 font-bold text-lg">Configuração do Lote</CardTitle>
            <CardDescription className="text-neutral-500 text-sm">O estoque inicial será disponibilizado imediatamente no Redis.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Nome do Lote *</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: VIP - Lote 1, Pista - Lote 2"
                  required
                  disabled={loading}
                  className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Preço (R$) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Ex: 150.00"
                    required
                    disabled={loading}
                    className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Quantidade Total *</label>
                  <Input
                    type="number"
                    step="1"
                    name="totalQuantity"
                    value={formData.totalQuantity}
                    onChange={handleChange}
                    placeholder="Ex: 500"
                    required
                    disabled={loading}
                    className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center pt-4 border-t border-[#EAEAEA] mt-6">
              <button
                type="button"
                onClick={() => router.push(`/events/${eventId}`)}
                disabled={loading}
                className="bg-transparent hover:bg-neutral-100 text-neutral-550 font-bold px-6 py-2.5 rounded-full border-none transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold py-2.5 px-6 rounded-full border-none transition-all cursor-pointer shadow-sm text-xs active:scale-95"
              >
                {loading ? 'Criando...' : 'Criar Lote'}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
