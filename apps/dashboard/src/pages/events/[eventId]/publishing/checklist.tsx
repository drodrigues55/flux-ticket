import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import EventLayout from '../../../../components/EventLayout';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@flux/ui';

interface ApiError {
  message: string;
  requestId?: string;
}

export default function PublishingChecklistPage() {
  const router = useRouter();
  const { eventId } = router.query as { eventId: string };

  const [eventName, setEventName] = useState('Carregando...');
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  const fetchChecklist = async () => {
    if (!eventId) return;
    try {
      const eventRes = await fetch(`/api/organizer/events/${eventId}`);
      const eventJson = await eventRes.json();
      if (eventRes.ok && eventJson.data) {
        setEventName(eventJson.data.event.name);
      }

      const res = await fetch(`/api/organizer/events/${eventId}/publishing/checklist`);
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Falha ao carregar checklist de publicação.' };
      setChecklist(json.data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [eventId]);

  const handlePublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/publish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Falha ao publicar evento.' };
      setConfirmPublish(false);
      await fetchChecklist();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/unpublish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw json.error || { message: 'Falha ao despublicar evento.' };
      setConfirmUnpublish(false);
      await fetchChecklist();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EventLayout eventId={eventId} eventName={eventName}>
        <div className="p-8 text-sm text-neutral-500">Carregando checklist...</div>
      </EventLayout>
    );
  }

  const isPublished = checklist?.eventStatus === 'PUBLISHED';

  return (
    <EventLayout eventId={eventId} eventName={eventName}>
      <div className="space-y-6 mt-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Checklist de Publicação</h1>
            <p className="text-xs text-neutral-500 mt-1">Verifique pendências antes de divulgar o evento.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/events/${eventId}/publishing/preview`}>
              <Button variant="outline" size="sm">Visualizar Preview</Button>
            </Link>
            {isPublished ? (
              <Button className="bg-neutral-800 hover:bg-neutral-900 text-white" size="sm" onClick={() => setConfirmUnpublish(true)} disabled={saving}>
                Despublicar Evento
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!checklist?.canPublish || saving}
                onClick={() => setConfirmPublish(true)}
              >
                Publicar Evento
              </Button>
            )}
          </div>
        </div>

        {/* Status Alert Banner */}
        <div className={`p-4 rounded-lg border flex items-center justify-between ${
          isPublished ? 'bg-green-50 border-green-200 text-green-800' : 'bg-neutral-50 border-neutral-200 text-neutral-800'
        }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block opacity-70">Status do Evento</span>
            <span className="text-lg font-extrabold">{isPublished ? 'Publicado e Disponível para Vendas!' : 'Rascunho'}</span>
          </div>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
            isPublished ? 'bg-green-100 border-green-300 text-green-700' : 'bg-neutral-100 border-neutral-300 text-neutral-600'
          }`}>
            {checklist?.eventStatus}
          </span>
        </div>

        {/* Error box */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
            <p className="font-semibold">{error.message}</p>
            {error.requestId && <p className="text-xs font-mono text-red-500">Request ID: {error.requestId}</p>}
          </div>
        )}

        {/* Validation Checklist Groups */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {checklist?.groups.map((group: any, i: number) => (
              <Card key={i} className="rounded-lg bg-white overflow-hidden">
                <CardHeader className="bg-neutral-50/55 border-b border-neutral-100"><CardTitle className="text-sm font-bold text-neutral-800">{group.name}</CardTitle></CardHeader>
                <CardContent className="p-0 divide-y divide-neutral-100">
                  {group.items.map((item: any) => {
                    const isPass = item.status === 'pass';
                    const isWarn = item.status === 'warn';
                    return (
                      <div key={item.id} className="p-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold text-white ${
                            isPass ? 'bg-green-500' : isWarn ? 'bg-amber-500' : 'bg-red-500'
                          }`}>
                            {isPass ? '✓' : isWarn ? '!' : '✗'}
                          </span>
                          <span className="font-medium text-neutral-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {!isPass && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isWarn ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.severity}
                            </span>
                          )}
                          {!isPass && item.fixUrl && (
                            <Link href={item.fixUrl} className="text-xs font-bold text-[#FF3200] hover:underline">
                              Corrigir
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar validation summary */}
          <div className="space-y-4">
            <Card className="rounded-lg bg-white">
              <CardHeader><CardTitle>Resumo de Validação</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>Bloqueadores ativos:</span>
                  <span className={`font-bold ${checklist?.blockers.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {checklist?.blockers.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avisos recomendados:</span>
                  <span className="font-bold text-amber-600">{checklist?.warnings.length}</span>
                </div>
                {!checklist?.canPublish && (
                  <p className="text-xs text-red-500 mt-2">
                    Resolva todos os bloqueadores (BLOCKER) para poder publicar este evento.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Publish Dialog */}
      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-950">Confirmar publicação?</h2>
            <p className="text-sm text-neutral-500">
              O evento ficará visível publicamente no aplicativo e no portal do comprador. Você poderá fazer edições futuras, mas o lote inicial de vendas começará de imediato ou conforme janelas configuradas.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmPublish(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handlePublish} disabled={saving}>{saving ? 'Publicando...' : 'Confirmar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Dialog */}
      {confirmUnpublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-950">Despublicar evento?</h2>
            <p className="text-sm text-neutral-500">
              O evento retornará para Rascunho (DRAFT) e as vendas serão pausadas de imediato. Ingressos já comprados continuarão no sistema, mas não será possível comprar novos até republicar.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmUnpublish(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleUnpublish} disabled={saving}>{saving ? 'Desativando...' : 'Confirmar'}</Button>
            </div>
          </div>
        </div>
      )}
    </EventLayout>
  );
}
