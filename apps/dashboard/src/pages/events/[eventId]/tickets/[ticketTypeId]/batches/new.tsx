import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import EventLayout from '../../../../../../components/EventLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flux/ui';

interface ApiError {
  message: string;
  requestId?: string;
}

export default function NewBatchPage() {
  const router = useRouter();
  const { eventId, ticketTypeId } = router.query as { eventId: string; ticketTypeId: string };

  const [eventName, setEventName] = useState('Carregando...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [form, setForm] = useState({
    name: '',
    price: 0,
    totalQuantity: 100,
    salesStart: '',
    salesEnd: '',
    purchaseLimit: 5,
    visibility: true,
  });

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/organizer/events/${eventId}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setEventName(json.data.event.name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        totalQuantity: Number(form.totalQuantity),
        salesStart: form.salesStart ? new Date(form.salesStart).toISOString() : null,
        salesEnd: form.salesEnd ? new Date(form.salesEnd).toISOString() : null,
        purchaseLimit: form.purchaseLimit ? Number(form.purchaseLimit) : null,
        visibility: form.visibility,
      };

      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw json.error || { message: 'Falha ao criar o lote.' };
      }
      router.push(`/events/${eventId}/tickets/${ticketTypeId}/batches`);
    } catch (err: any) {
      setError(err);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EventLayout eventId={eventId} eventName={eventName}>
        <div className="p-8 text-sm text-neutral-500">Carregando formulário...</div>
      </EventLayout>
    );
  }

  return (
    <EventLayout eventId={eventId} eventName={eventName}>
      <div className="space-y-6 mt-4">
        <div>
          <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches`} className="text-sm font-bold text-neutral-500 hover:text-neutral-700">
            ← Voltar para Lotes
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">Criar Novo Lote</h1>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
            <p className="font-semibold">{error.message}</p>
            {error.requestId && <p className="text-xs font-mono text-red-500">Request ID: {error.requestId}</p>}
          </div>
        )}

        <Card className="rounded-lg bg-white">
          <CardHeader><CardTitle>Informações do Lote</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1 col-span-2">
                  <span className="text-xs font-bold text-neutral-600">Nome do Lote</span>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Lote 1, Promocional, etc." />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Preço (R$)</span>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Capacidade / Quantidade</span>
                  <Input type="number" value={form.totalQuantity} onChange={(e) => setForm({ ...form, totalQuantity: Number(e.target.value) })} required />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Início das Vendas</span>
                  <Input type="datetime-local" value={form.salesStart} onChange={(e) => setForm({ ...form, salesStart: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Término das Vendas</span>
                  <Input type="datetime-local" value={form.salesEnd} onChange={(e) => setForm({ ...form, salesEnd: e.target.value })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Limite de Compra por Usuário (Opcional)</span>
                  <Input type="number" value={form.purchaseLimit} onChange={(e) => setForm({ ...form, purchaseLimit: Number(e.target.value) })} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-neutral-600">Visibilidade</span>
                  <select
                    className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-sm bg-white"
                    value={form.visibility ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value === 'true' })}
                  >
                    <option value="true">Público</option>
                    <option value="false">Oculto</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Lote'}
                </Button>
                <Link href={`/events/${eventId}/tickets/${ticketTypeId}/batches`}>
                  <Button variant="secondary" type="button">Cancelar</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </EventLayout>
  );
}
